'use client';

import { useState, useMemo } from 'react';
import { Plus, X, Search, Settings } from 'lucide-react';
import { FieldMapping, WidgetField, DisplayMode } from '@/types';
import { formatOptions, currencySymbols } from '@/utils/formatting';

/**
 * Props for JSONFieldSelector component
 */
interface JSONFieldSelectorProps {
  fields: FieldMapping[]; // Available fields from API response
  selectedFields: WidgetField[]; // Currently selected fields
  onFieldsChange: (fields: WidgetField[]) => void; // Callback when fields change
  displayMode: DisplayMode; // Current display mode
  onDisplayModeChange: (mode: DisplayMode) => void; // Callback when display mode changes
  showArraysOnly: boolean; // Whether to filter to show only array fields
  onShowArraysOnlyChange: (show: boolean) => void; // Callback when filter changes
  detectedCurrency?: { code: string; symbol: string; path: string } | null; // Auto-detected currency
}

/**
 * JSON field selector component for exploring and configuring fields
 * @param props - JSONFieldSelectorProps
 */
export default function JSONFieldSelector({
  fields,
  selectedFields,
  onFieldsChange,
  displayMode,
  onDisplayModeChange,
  showArraysOnly,
  onShowArraysOnlyChange,
  detectedCurrency,
}: JSONFieldSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFields = useMemo(() => {
    if (!searchQuery) return fields;
    
    const query = searchQuery.toLowerCase();
    const filterFields = (fieldList: FieldMapping[]): FieldMapping[] => {
      const result: FieldMapping[] = [];
      
      for (const field of fieldList) {
        const matches = field.path.toLowerCase().includes(query);
        const filteredChildren = field.children ? filterFields(field.children) : undefined;
        
        if (matches || (filteredChildren && filteredChildren.length > 0)) {
          result.push({
            ...field,
            children: filteredChildren,
          });
        }
      }
      
      return result;
    };
    
    return filterFields(fields);
  }, [fields, searchQuery]);

  const addField = (field: FieldMapping) => {
    if (selectedFields.some((f) => f.path === field.path)) return;
    
    const newField: WidgetField = {
      path: field.path,
      displayName: field.path.split('.').pop() || field.path,
      type: field.type as any,
    };
    
    onFieldsChange([...selectedFields, newField]);
  };

  const removeField = (path: string) => {
    onFieldsChange(selectedFields.filter((f) => f.path !== path));
  };

  const renderField = (field: FieldMapping, level = 0) => (
    <div key={field.path} className="mb-1">
      <div className="flex items-center justify-between p-2 hover:bg-dark-bg rounded group">
        <div className="flex-1 min-w-0">
          <div className="text-sm text-dark-text font-mono truncate" style={{ paddingLeft: `${level * 12}px` }}>
            {field.path}
          </div>
          <div className="text-xs text-dark-muted mt-0.5">
            {field.type} {field.value && `| ${String(field.value).substring(0, 50)}`}
          </div>
        </div>
        {!selectedFields.some((f) => f.path === field.path) && (
          <button
            onClick={() => addField(field)}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-primary/20 rounded transition-opacity"
          >
            <Plus className="w-4 h-4 text-primary" />
          </button>
        )}
      </div>
      {field.children && field.children.length > 0 && (
        <div className="ml-4">
          {field.children.map((child) => renderField(child, level + 1))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Display Mode */}
      <div>
        <label className="block text-sm font-medium text-dark-text mb-2">Display Mode</label>
        <div className="flex gap-2">
          {(['card', 'table', 'chart'] as DisplayMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onDisplayModeChange(mode)}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                displayMode === mode
                  ? 'bg-primary text-white'
                  : 'bg-dark-bg text-dark-muted hover:text-dark-text'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div>
        <label className="block text-sm font-medium text-dark-text mb-2">Search Fields</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dark-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for fields..."
            className="w-full pl-10 pr-4 py-2 bg-dark-bg border border-dark-border rounded text-dark-text placeholder-dark-muted focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Show Arrays Only */}
      {displayMode === 'table' && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showArraysOnly"
            checked={showArraysOnly}
            onChange={(e) => onShowArraysOnlyChange(e.target.checked)}
            className="w-4 h-4 text-primary bg-dark-bg border-dark-border rounded focus:ring-primary"
          />
          <label htmlFor="showArraysOnly" className="text-sm text-dark-text">
            Show arrays only (for table view)
          </label>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Available Fields */}
        <div>
          <label className="block text-sm font-medium text-dark-text mb-2">Available Fields</label>
          <div className="bg-dark-bg border border-dark-border rounded p-3 max-h-96 overflow-y-auto">
            {filteredFields.length === 0 ? (
              <p className="text-sm text-dark-muted text-center py-4">No fields found</p>
            ) : (
              filteredFields.map((field) => renderField(field))
            )}
          </div>
        </div>

        {/* Selected Fields */}
        <div>
          <label className="block text-sm font-medium text-dark-text mb-2">Selected Fields</label>
          <div className="bg-dark-bg border border-dark-border rounded p-3 max-h-96 overflow-y-auto space-y-2">
            {selectedFields.length === 0 ? (
              <p className="text-sm text-dark-muted text-center py-4">No fields selected</p>
            ) : (
              selectedFields.map((field, index) => (
                <FieldConfigItem
                  key={field.path}
                  field={field}
                  onUpdate={(updated) => {
                    const newFields = [...selectedFields];
                    newFields[index] = updated;
                    onFieldsChange(newFields);
                  }}
                  onRemove={() => removeField(field.path)}
                  detectedCurrency={detectedCurrency}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Field configuration component for selected fields
function FieldConfigItem({
  field,
  onUpdate,
  onRemove,
  detectedCurrency,
}: {
  field: WidgetField;
  onUpdate: (field: WidgetField) => void;
  onRemove: () => void;
  detectedCurrency?: { code: string; symbol: string; path: string } | null;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFormatChange = (format: WidgetField['format']) => {
    onUpdate({ ...field, format });
  };

  const handleCurrencySymbolChange = (symbol: string) => {
    onUpdate({ ...field, currencySymbol: symbol });
  };

  const handleDecimalPlacesChange = (places: number) => {
    onUpdate({ ...field, decimalPlaces: places });
  };

  const handleDisplayNameChange = (name: string) => {
    onUpdate({ ...field, displayName: name });
  };

  return (
    <div className="border border-dark-border rounded p-2 hover:bg-dark-card transition-colors">
      <div className="flex items-center justify-between group">
        <div className="flex-1 min-w-0">
          <div className="text-sm text-dark-text font-mono truncate">{field.path}</div>
          {field.displayName && field.displayName !== field.path && (
            <div className="text-xs text-dark-muted">{field.displayName}</div>
          )}
          {field.format && field.format !== 'none' && (
            <div className="text-xs text-primary mt-1">
              Format: {formatOptions.find((f) => f.value === field.format)?.label}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-dark-bg rounded transition-opacity"
            title="Configure"
          >
            <Settings className="w-4 h-4 text-dark-muted" />
          </button>
          <button
            onClick={onRemove}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-opacity"
            title="Remove"
          >
            <X className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-dark-border space-y-3">
          {/* Display Name */}
          <div>
            <label className="block text-xs font-medium text-dark-text mb-1">Display Name</label>
            <input
              type="text"
              value={field.displayName || ''}
              onChange={(e) => handleDisplayNameChange(e.target.value)}
              placeholder="Custom display name (optional)"
              className="w-full px-2 py-1 text-xs bg-dark-bg border border-dark-border rounded text-dark-text focus:outline-none focus:border-primary"
            />
          </div>

          {/* Format */}
          <div>
            <label className="block text-xs font-medium text-dark-text mb-1">Format</label>
            <select
              value={field.format || 'none'}
              onChange={(e) => handleFormatChange(e.target.value as WidgetField['format'])}
              className="w-full px-2 py-1 text-xs bg-dark-bg border border-dark-border rounded text-dark-text focus:outline-none focus:border-primary"
            >
              {formatOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Currency Symbol (if currency format) */}
          {field.format === 'currency' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-dark-text">Currency Symbol</label>
                {detectedCurrency && !field.currencySymbol && (
                  <span className="text-[10px] text-primary bg-primary/20 px-1.5 py-0.5 rounded">
                    Auto: {detectedCurrency.symbol} ({detectedCurrency.code})
                  </span>
                )}
              </div>
              <select
                value={field.currencySymbol || (detectedCurrency?.symbol) || '$'}
                onChange={(e) => handleCurrencySymbolChange(e.target.value)}
                className="w-full px-2 py-1 text-xs bg-dark-bg border border-dark-border rounded text-dark-text focus:outline-none focus:border-primary"
              >
                {detectedCurrency && !field.currencySymbol && (
                  <option value={detectedCurrency.symbol} className="font-medium">
                    {detectedCurrency.symbol} - {detectedCurrency.code} (Auto-detected)
                  </option>
                )}
                {currencySymbols.map((symbol) => (
                  <option key={symbol.value} value={symbol.value}>
                    {symbol.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Decimal Places (for currency, percentage, number) */}
          {(field.format === 'currency' || field.format === 'percentage' || field.format === 'number') && (
            <div>
              <label className="block text-xs font-medium text-dark-text mb-1">Decimal Places</label>
              <input
                type="number"
                value={field.decimalPlaces !== undefined ? field.decimalPlaces : 2}
                onChange={(e) => handleDecimalPlacesChange(parseInt(e.target.value) || 2)}
                min="0"
                max="10"
                className="w-full px-2 py-1 text-xs bg-dark-bg border border-dark-border rounded text-dark-text focus:outline-none focus:border-primary"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}


