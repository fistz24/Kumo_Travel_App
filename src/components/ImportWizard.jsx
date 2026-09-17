import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, TriangleAlert, CircleCheck, LoaderCircle, ArrowRight } from 'lucide-react';
import { Modal, Btn, Card, Pill, inputStyle } from './ui';
import {
  IMPORT_TYPES, IMPORT_TYPE_ORDER, parseWorkbook, detectSheetType, suggestMapping,
  buildRecords, mergeRecordSets,
} from '../lib/excelImport';

const RECORD_LABELS = {
  itineraryDays: 'itinerary days',
  activities: 'activities',
  places: 'places',
  hotels: 'stays',
  transport: 'transport segments',
  expenses: 'expenses',
};

/**
 * Merge a built record set into the app's data object, avoiding duplicate
 * itinerary days for dates that already exist in the trip.
 */
function mergeIntoTripData(data, tripId, recordSet) {
  const existingDays = data.itineraryDays.filter(d => d.tripId === tripId);
  const dayIdByDate = new Map(existingDays.map(d => [d.date, d.id]));
  const dayIdRemap = new Map(); // newDay.id -> final id (existing or itself)

  const daysToAdd = [];
  let updatedDays = data.itineraryDays;
  for (const day of recordSet.itineraryDays) {
    const existingId = dayIdByDate.get(day.date);
    if (existingId) {
      dayIdRemap.set(day.id, existingId);
      if (day.notes) {
        updatedDays = updatedDays.map(d => (d.id === existingId && !d.notes) ? { ...d, notes: day.notes } : d);
      }
    } else {
      dayIdRemap.set(day.id, day.id);
      dayIdByDate.set(day.date, day.id);
      daysToAdd.push(day);
    }
  }

  const activitiesToAdd = recordSet.activities.map(a => ({
    ...a,
    dayId: dayIdRemap.get(a.dayId) || a.dayId,
  }));

  return {
    ...data,
    itineraryDays: [...updatedDays, ...daysToAdd],
    activities: [...data.activities, ...activitiesToAdd],
    places: [...data.places, ...recordSet.places],
    hotels: [...data.hotels, ...recordSet.hotels],
    transport: [...data.transport, ...recordSet.transport],
    expenses: [...data.expenses, ...recordSet.expenses],
  };
}

function FieldMappingRow({ fieldKey, field, headers, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
      <div style={{ width: 130, flexShrink: 0, fontSize: 13, fontWeight: 700 }}>
        {field.label}{field.required && <span style={{ color: '#C75C4A' }}> *</span>}
      </div>
      <select value={value || ''} onChange={e => onChange(fieldKey, e.target.value)} style={{ ...inputStyle, padding: '6px 10px', fontSize: 13 }}>
        <option value="">— none —</option>
        {headers.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
    </div>
  );
}

function SheetReviewCard({ sheet, config, onChangeType, onChangeMapping }) {
  const { sheetName, headers, rows } = sheet;
  const def = config.type ? IMPORT_TYPES[config.type] : null;

  const missingRequired = def
    ? Object.entries(def.fields).filter(([k, f]) => f.required && !config.mapping[k]).map(([, f]) => f.label)
    : [];

  return (
    <Card style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileSpreadsheet size={18} color="var(--kumo-primary-text)" />
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{sheetName}</div>
            <div style={{ fontSize: 12, color: 'var(--kumo-text-soft)' }}>{rows.length} row{rows.length === 1 ? '' : 's'}</div>
          </div>
        </div>
        <select
          value={config.type || ''}
          onChange={e => onChangeType(sheetName, e.target.value || null)}
          style={{ ...inputStyle, width: 'auto', fontWeight: 700 }}
        >
          <option value="">Skip this sheet</option>
          {IMPORT_TYPE_ORDER.map(k => <option key={k} value={k}>Import as: {IMPORT_TYPES[k].label}</option>)}
        </select>
      </div>

      {def && (
        <>
          {missingRequired.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#A8763E', background: '#F6E9D8', padding: '6px 10px', borderRadius: 10, marginBottom: 8 }}>
              <TriangleAlert size={14} /> Map a column for: {missingRequired.join(', ')} (rows without this will be skipped)
            </div>
          )}
          <div style={{ background: 'var(--kumo-soft)', borderRadius: 12, padding: '8px 12px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--kumo-text-soft)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Column mapping
            </div>
            {Object.entries(def.fields).map(([fieldKey, field]) => (
              <FieldMappingRow
                key={fieldKey}
                fieldKey={fieldKey}
                field={field}
                headers={headers}
                value={config.mapping[fieldKey]}
                onChange={(fk, v) => onChangeMapping(sheetName, fk, v)}
              />
            ))}
          </div>

          {rows.length > 0 && (
            <div style={{ marginTop: 10, overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {Object.entries(def.fields).filter(([k]) => config.mapping[k]).map(([k, f]) => (
                      <th key={k} style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--kumo-text-soft)', fontWeight: 600, borderBottom: '1px solid var(--kumo-soft)', whiteSpace: 'nowrap' }}>{f.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 3).map((row, i) => (
                    <tr key={i}>
                      {Object.entries(def.fields).filter(([k]) => config.mapping[k]).map(([k]) => {
                        const v = row[config.mapping[k]];
                        const display = v instanceof Date ? v.toLocaleDateString() : String(v ?? '');
                        return <td key={k} style={{ padding: '4px 8px', borderBottom: '1px solid var(--kumo-soft)', whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{display}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

export default function ImportWizard({ trip, data, setData, onClose }) {
  const [step, setStep] = useState('upload'); // upload | review | done
  const [sheets, setSheets] = useState([]);
  const [configs, setConfigs] = useState({}); // sheetName -> { type, mapping }
  const [error, setError] = useState('');
  const [parsing, setParsing] = useState(false);
  const [summary, setSummary] = useState(null);
  const fileRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setError('');
    setParsing(true);
    try {
      const parsedSheets = await parseWorkbook(file);
      if (parsedSheets.length === 0) {
        setError('No data found in this file.');
        setParsing(false);
        return;
      }
      const initialConfigs = {};
      for (const sheet of parsedSheets) {
        const { suggestedType, mapping } = detectSheetType(sheet);
        initialConfigs[sheet.sheetName] = { type: suggestedType, mapping };
      }
      setSheets(parsedSheets);
      setConfigs(initialConfigs);
      setStep('review');
    } catch (err) {
      console.error(err);
      setError("Could not read this file. Make sure it's a valid .xlsx, .xls, or .csv file.");
    } finally {
      setParsing(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const changeType = (sheetName, newType) => {
    setConfigs(prev => {
      const sheet = sheets.find(s => s.sheetName === sheetName);
      const mapping = newType ? suggestMapping(sheet.headers, newType) : {};
      return { ...prev, [sheetName]: { type: newType, mapping } };
    });
  };

  const changeMapping = (sheetName, fieldKey, header) => {
    setConfigs(prev => ({
      ...prev,
      [sheetName]: {
        ...prev[sheetName],
        mapping: { ...prev[sheetName].mapping, [fieldKey]: header || undefined },
      },
    }));
  };

  const doImport = () => {
    const sets = [];
    for (const sheet of sheets) {
      const config = configs[sheet.sheetName];
      if (!config || !config.type) continue;
      sets.push(buildRecords(config.type, sheet.rows, config.mapping, trip.id, trip.currency));
    }
    const merged = mergeRecordSets(sets);
    setData(d => mergeIntoTripData(d, trip.id, merged));
    setSummary(merged);
    setStep('done');
  };

  const activeSheetCount = Object.values(configs).filter(c => c && c.type).length;

  return (
    <Modal title={`Import into ${trip.name}`} onClose={onClose} width={680}>
      {step === 'upload' && (
        <div>
          <p style={{ fontSize: 14, color: 'var(--kumo-text-soft)', marginTop: 0, lineHeight: 1.6 }}>
            Upload an Excel (.xlsx / .xls) or CSV file with your itinerary, places, hotels,
            transport, or expenses. Kumo will scan each sheet, guess what it contains, and
            suggest how to map its columns — you can review and adjust everything before
            anything is imported.
          </p>
          <div
            onDrop={onDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current && fileRef.current.click()}
            style={{
              border: '2px dashed var(--kumo-soft)', borderRadius: 16, padding: '36px 20px',
              textAlign: 'center', cursor: 'pointer', background: 'var(--kumo-surface)',
            }}
          >
            {parsing ? (
              <>
                <LoaderCircle size={28} color="var(--kumo-primary-text)" style={{ animation: 'kumo-spin 1s linear infinite' }} />
                <div style={{ marginTop: 10, fontWeight: 700, fontSize: 14 }}>Reading your file...</div>
              </>
            ) : (
              <>
                <Upload size={28} color="var(--kumo-primary-text)" />
                <div style={{ marginTop: 10, fontWeight: 600, fontSize: 15 }}>Click to choose a file, or drag it here</div>
                <div style={{ fontSize: 12.5, color: 'var(--kumo-text-soft)', marginTop: 4 }}>.xlsx, .xls, or .csv</div>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])} />
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#C75C4A', marginTop: 12 }}>
              <TriangleAlert size={15} /> {error}
            </div>
          )}
          <style>{`@keyframes kumo-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {step === 'review' && (
        <div>
          <p style={{ fontSize: 13.5, color: 'var(--kumo-text-soft)', margin: '0 0 12px' }}>
            Found {sheets.length} sheet{sheets.length === 1 ? '' : 's'}. Choose how each one should be
            imported, then check the column mapping below it. Mapping is suggested automatically — adjust anything that looks off.
          </p>

          {sheets.map(sheet => (
            <SheetReviewCard
              key={sheet.sheetName}
              sheet={sheet}
              config={configs[sheet.sheetName] || { type: null, mapping: {} }}
              onChangeType={changeType}
              onChangeMapping={changeMapping}
            />
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, flexWrap: 'wrap', gap: 8 }}>
            <Btn variant="ghost" onClick={() => setStep('upload')}>Back</Btn>
            <Btn icon={ArrowRight} onClick={doImport} disabled={activeSheetCount === 0}>
              Import {activeSheetCount > 0 ? `${activeSheetCount} sheet${activeSheetCount === 1 ? '' : 's'}` : ''}
            </Btn>
          </div>
        </div>
      )}

      {step === 'done' && summary && (
        <div>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CircleCheck size={40} color="#3F8C7E" />
            <h3 style={{ margin: '12px 0 4px', fontSize: 18, fontWeight: 600 }}>Import complete</h3>
            <p style={{ fontSize: 13.5, color: 'var(--kumo-text-soft)', margin: 0 }}>Here's what was added to {trip.name}:</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
            {Object.entries(summary).map(([key, arr]) => arr.length > 0 && (
              <Pill key={key}>{arr.length} {RECORD_LABELS[key]}</Pill>
            ))}
            {Object.values(summary).every(arr => arr.length === 0) && (
              <Pill>Nothing was imported — check your column mapping and try again.</Pill>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Btn onClick={onClose}>Done</Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}
