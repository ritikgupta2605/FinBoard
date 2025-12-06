/**
 * Table Widget Component
 * 
 * Displays widget data in a sortable, filterable, and searchable table format.
 * Supports pagination, column filtering (text, number, date, select, multiselect),
 * sorting, and search functionality.
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';
import { WidgetConfig, WidgetField } from '@/types';
import { useWidgetData } from '@/hooks/useWidgetData';
import { getNestedValue } from '@/utils/api';
import { formatFieldValue } from '@/utils/formatting';
import { FilterType, ColumnFilter, FilterState } from '@/types/filters';

/**
 * Props for TableWidget component
 */
interface TableWidgetProps {
  widget: WidgetConfig; // Widget configuration
}

/**
 * Sort configuration for table columns
 */
type SortConfig = {
  field: string; // Field path to sort by
  direction: 'asc' | 'desc'; // Sort direction
};

/**
 * Table widget component with advanced filtering and sorting
 * @param widget - Widget configuration containing fields to display
 * @returns Table widget JSX with data, filters, and pagination
 */
export default function TableWidget({ widget }: TableWidgetProps) {
  const { data, loading, error, getFieldValue } = useWidgetData(widget);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [columnFilters, setColumnFilters] = useState<FilterState>({});
  const [showFilters, setShowFilters] = useState(false);

  // Extract array data from the first selected field
  const tableData = useMemo(() => {
    if (!data || widget.selectedFields.length === 0) return [];

    // Try to find array data
    const firstField = widget.selectedFields[0];
    const fieldValue = getNestedValue(data, firstField.path);
    
    if (Array.isArray(fieldValue)) {
      return fieldValue;
    }

    // If data itself is an array
    if (Array.isArray(data)) {
      return data;
    }

    // Try to find any array in the data (including nested objects)
    const findArray = (obj: any, path = ''): { array: any[]; path: string } | null => {
      if (Array.isArray(obj)) return { array: obj, path };
      if (typeof obj === 'object' && obj !== null) {
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;
          if (Array.isArray(value) && value.length > 0) {
            return { array: value, path: currentPath };
          }
          const found = findArray(value, currentPath);
          if (found) return found;
        }
      }
      return null;
    };

    const found = findArray(data);
    if (found) {
      // If we found an array, we need to adjust the field paths
      // Remove the array path prefix from selected fields
      return found.array;
    }
    
    return [];
  }, [data, widget.selectedFields]);

  // Detect field types for filter options
  const fieldTypes = useMemo(() => {
    const types: Record<string, FilterType> = {};
    
    if (tableData.length > 0) {
      widget.selectedFields.forEach((field) => {
        const sampleValue = getNestedValue(tableData[0], field.path);
        
        if (sampleValue === null || sampleValue === undefined) {
          types[field.path] = 'text';
        } else if (typeof sampleValue === 'number') {
          types[field.path] = 'number';
        } else if (typeof sampleValue === 'string') {
          // Check if it's a date string
          const dateValue = new Date(sampleValue);
          if (!isNaN(dateValue.getTime()) && sampleValue.match(/^\d{4}-\d{2}-\d{2}/)) {
            types[field.path] = 'date';
          } else {
            types[field.path] = 'text';
          }
        } else if (sampleValue instanceof Date) {
          types[field.path] = 'date';
        } else {
          types[field.path] = 'text';
        }
      });
    }
    
    return types;
  }, [tableData, widget.selectedFields]);

  // Get unique values for select/multiselect filters
  const fieldUniqueValues = useMemo(() => {
    const values: Record<string, string[]> = {};
    
    widget.selectedFields.forEach((field) => {
      const uniqueSet = new Set<string>();
      tableData.forEach((row) => {
        const value = getNestedValue(row, field.path);
        if (value !== null && value !== undefined) {
          uniqueSet.add(String(value));
        }
      });
      values[field.path] = Array.from(uniqueSet).sort();
    });
    
    return values;
  }, [tableData, widget.selectedFields]);

  // Initialize filter for a field
  const initializeFilter = (fieldPath: string): ColumnFilter => {
    const filterType = fieldTypes[fieldPath] || 'text';
    return {
      fieldPath,
      filterType,
    };
  };

  // Handle filter changes
  const handleFilterChange = (fieldPath: string, updates: Partial<ColumnFilter>) => {
    setColumnFilters((prev) => {
      const currentFilter = prev[fieldPath] || initializeFilter(fieldPath);
      return {
        ...prev,
        [fieldPath]: {
          ...currentFilter,
          ...updates,
        },
      };
    });
  };

  // Clear a specific filter
  const clearFilter = (fieldPath: string) => {
    setColumnFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[fieldPath];
      return newFilters;
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    setColumnFilters({});
  };

  // Check if there are active filters
  const hasActiveFilters = useMemo(() => {
    return Object.values(columnFilters).some((filter) => {
      return (
        filter.value ||
        filter.min !== undefined ||
        filter.max !== undefined ||
        filter.dateFrom ||
        filter.dateTo ||
        (filter.selectedOptions && filter.selectedOptions.length > 0)
      );
    });
  }, [columnFilters]);

  const filteredAndSortedData = useMemo(() => {
    let result = [...tableData];

    // Apply column filters
    Object.values(columnFilters).forEach((filter) => {
      if (!filter.value && !filter.min && !filter.max && !filter.dateFrom && !filter.dateTo && 
          (!filter.selectedOptions || filter.selectedOptions.length === 0)) {
        return; // Skip empty filters
      }

      result = result.filter((row) => {
        const cellValue = getNestedValue(row, filter.fieldPath);
        
        switch (filter.filterType) {
          case 'text':
            if (filter.value) {
              return String(cellValue).toLowerCase().includes(String(filter.value).toLowerCase());
            }
            return true;
            
          case 'number':
            const numValue = Number(cellValue);
            if (isNaN(numValue)) return false;
            if (filter.min !== undefined && numValue < filter.min) return false;
            if (filter.max !== undefined && numValue > filter.max) return false;
            return true;
            
          case 'date':
            if (!cellValue) return false;
            const dateValue = new Date(cellValue);
            if (isNaN(dateValue.getTime())) return false;
            if (filter.dateFrom) {
              const fromDate = new Date(filter.dateFrom);
              if (dateValue < fromDate) return false;
            }
            if (filter.dateTo) {
              const toDate = new Date(filter.dateTo);
              toDate.setHours(23, 59, 59, 999); // Include entire end date
              if (dateValue > toDate) return false;
            }
            return true;
            
          case 'select':
            if (filter.value) {
              return String(cellValue) === String(filter.value);
            }
            return true;
            
          case 'multiselect':
            if (filter.selectedOptions && filter.selectedOptions.length > 0) {
              return filter.selectedOptions.includes(String(cellValue));
            }
            return true;
            
          default:
            return true;
        }
      });
    });

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      if (query) {
        result = result.filter((row) => {
          return widget.selectedFields.some((field) => {
            // Try multiple path variations to handle different data structures
            let value = getNestedValue(row, field.path);
            
            // If value is null/undefined, try alternative paths
            if (value === null || value === undefined) {
              // Try just the field name (last part of path)
              const pathParts = field.path.split('.');
              const lastPart = pathParts[pathParts.length - 1];
              // Remove array notation if present
              const cleanFieldName = lastPart.replace(/\[.*?\]/g, '');
              
              // Try direct access on the row
              if (row && typeof row === 'object' && cleanFieldName in row) {
                value = row[cleanFieldName];
              }
            }
            
            // Handle null/undefined values
            if (value === null || value === undefined) {
              return false;
            }
            
            // Convert to string and search (case-insensitive)
            const searchableValue = String(value).toLowerCase();
            return searchableValue.includes(query);
          });
        });
      }
    }

    // Apply sorting
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = getNestedValue(a, sortConfig.field);
        const bValue = getNestedValue(b, sortConfig.field);
        
        const aNum = Number(aValue);
        const bNum = Number(bValue);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
        }
        
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        
        if (sortConfig.direction === 'asc') {
          return aStr.localeCompare(bStr);
        } else {
          return bStr.localeCompare(aStr);
        }
      });
    }

    return result;
  }, [tableData, searchQuery, sortConfig, columnFilters, widget.selectedFields]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = filteredAndSortedData.slice(startIndex, endIndex);

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortConfig, columnFilters]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleSort = (fieldPath: string) => {
    if (sortConfig?.field === fieldPath) {
      if (sortConfig.direction === 'asc') {
        setSortConfig({ field: fieldPath, direction: 'desc' });
      } else {
        setSortConfig(null);
      }
    } else {
      setSortConfig({ field: fieldPath, direction: 'asc' });
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-10 bg-dark-bg rounded animate-pulse" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-dark-bg rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (tableData.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-dark-muted text-sm mb-2">No data available</p>
        <p className="text-dark-muted text-xs mb-4">
          {'The API response doesn\'t contain array data. Check the API response structure.'}
        </p>
        <details className="mt-4 text-left max-w-full">
          <summary className="text-xs text-dark-muted cursor-pointer">Debug: API Response</summary>
          <pre className="mt-2 text-xs text-dark-muted bg-dark-bg p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(data, null, 2)}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Toggle */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dark-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${tableData.length} records...`}
            className="w-full pl-10 pr-4 py-2 bg-dark-bg border border-dark-border rounded text-dark-text placeholder-dark-muted focus:outline-none focus:border-primary"
          />
          {searchQuery && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-dark-muted">
              {filteredAndSortedData.length} result{filteredAndSortedData.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 bg-dark-bg border border-dark-border rounded text-dark-text hover:bg-dark-hover transition-colors flex items-center gap-2 ${
            hasActiveFilters ? 'border-primary' : ''
          }`}
          title="Toggle column filters"
        >
          <Filter className={`w-4 h-4 ${hasActiveFilters ? 'text-primary' : 'text-dark-muted'}`} />
          {hasActiveFilters && (
            <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">
              {Object.keys(columnFilters).length}
            </span>
          )}
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="px-3 py-2 bg-dark-bg border border-dark-border rounded text-dark-muted hover:text-dark-text hover:bg-dark-hover transition-colors"
            title="Clear all filters"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Column Filters Panel */}
      {showFilters && (
        <div className="mb-4 p-4 bg-dark-bg border border-dark-border rounded">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-dark-text">Column Filters</h4>
            <button
              onClick={clearAllFilters}
              className="text-xs text-dark-muted hover:text-dark-text"
            >
              Clear All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {widget.selectedFields.map((field) => {
              const displayName = field.displayName || field.path.split('.').pop() || field.path;
              const filterType = fieldTypes[field.path] || 'text';
              const filter = columnFilters[field.path] || initializeFilter(field.path);
              const uniqueValues = fieldUniqueValues[field.path] || [];

              return (
                <div key={field.path} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-dark-muted">{displayName}</label>
                    {columnFilters[field.path] && (
                      <button
                        onClick={() => clearFilter(field.path)}
                        className="text-xs text-dark-muted hover:text-red-400"
                        title="Clear filter"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Text Filter */}
                  {filterType === 'text' && (
                    <input
                      type="text"
                      value={filter.value || ''}
                      onChange={(e) => handleFilterChange(field.path, { value: e.target.value })}
                      placeholder="Filter text..."
                      className="w-full px-3 py-1.5 text-sm bg-dark-card border border-dark-border rounded text-dark-text placeholder-dark-muted focus:outline-none focus:border-primary"
                    />
                  )}

                  {/* Number Range Filter */}
                  {filterType === 'number' && (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={filter.min ?? ''}
                        onChange={(e) => handleFilterChange(field.path, { 
                          min: e.target.value ? Number(e.target.value) : undefined 
                        })}
                        placeholder="Min"
                        className="flex-1 px-3 py-1.5 text-sm bg-dark-card border border-dark-border rounded text-dark-text placeholder-dark-muted focus:outline-none focus:border-primary"
                      />
                      <input
                        type="number"
                        value={filter.max ?? ''}
                        onChange={(e) => handleFilterChange(field.path, { 
                          max: e.target.value ? Number(e.target.value) : undefined 
                        })}
                        placeholder="Max"
                        className="flex-1 px-3 py-1.5 text-sm bg-dark-card border border-dark-border rounded text-dark-text placeholder-dark-muted focus:outline-none focus:border-primary"
                      />
                    </div>
                  )}

                  {/* Date Range Filter */}
                  {filterType === 'date' && (
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={filter.dateFrom || ''}
                        onChange={(e) => handleFilterChange(field.path, { dateFrom: e.target.value })}
                        className="flex-1 px-3 py-1.5 text-sm bg-dark-card border border-dark-border rounded text-dark-text focus:outline-none focus:border-primary"
                      />
                      <input
                        type="date"
                        value={filter.dateTo || ''}
                        onChange={(e) => handleFilterChange(field.path, { dateTo: e.target.value })}
                        className="flex-1 px-3 py-1.5 text-sm bg-dark-card border border-dark-border rounded text-dark-text focus:outline-none focus:border-primary"
                      />
                    </div>
                  )}

                  {/* Select Filter (for fields with limited unique values) */}
                  {filterType === 'text' && uniqueValues.length > 0 && uniqueValues.length <= 20 && (
                    <select
                      value={filter.value || ''}
                      onChange={(e) => handleFilterChange(field.path, { 
                        value: e.target.value,
                        filterType: 'select'
                      })}
                      className="w-full px-3 py-1.5 text-sm bg-dark-card border border-dark-border rounded text-dark-text focus:outline-none focus:border-primary"
                    >
                      <option value="">All values</option>
                      {uniqueValues.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Multi-select Filter (for categorical data) */}
                  {filterType === 'text' && uniqueValues.length > 0 && uniqueValues.length <= 50 && (
                    <div className="max-h-32 overflow-y-auto border border-dark-border rounded p-2 bg-dark-card">
                      {uniqueValues.slice(0, 20).map((value) => {
                        const isSelected = filter.selectedOptions?.includes(value) || false;
                        return (
                          <label
                            key={value}
                            className="flex items-center gap-2 py-1 text-xs text-dark-text cursor-pointer hover:bg-dark-bg px-2 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const currentOptions = filter.selectedOptions || [];
                                const newOptions = e.target.checked
                                  ? [...currentOptions, value]
                                  : currentOptions.filter((opt) => opt !== value);
                                handleFilterChange(field.path, { 
                                  selectedOptions: newOptions,
                                  filterType: 'multiselect'
                                });
                              }}
                              className="w-3 h-3 text-primary bg-dark-bg border-dark-border rounded focus:ring-primary"
                            />
                            <span className="truncate">{value}</span>
                          </label>
                        );
                      })}
                      {uniqueValues.length > 20 && (
                        <p className="text-xs text-dark-muted mt-2 text-center">
                          +{uniqueValues.length - 20} more values
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table */}
      {filteredAndSortedData.length === 0 && (searchQuery || hasActiveFilters) ? (
        <div className="text-center py-8 border border-dark-border rounded">
          <p className="text-dark-muted text-sm mb-2">
            No results found
            {searchQuery && ` for "${searchQuery}"`}
          </p>
          <p className="text-dark-muted text-xs">
            {searchQuery && hasActiveFilters
              ? 'Try adjusting your search query or filters'
              : searchQuery
              ? 'Try a different search term'
              : 'Try adjusting your filters'}
          </p>
          <p className="text-dark-muted text-xs mt-2">
            Total records in table: {tableData.length}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border">
                {widget.selectedFields.map((field) => {
                  const displayName = field.displayName || field.path.split('.').pop() || field.path;
                  const isSorted = sortConfig?.field === field.path;
                  
                  return (
                    <th
                      key={field.path}
                      className="text-left p-3 text-sm font-medium text-dark-muted cursor-pointer hover:text-dark-text transition-colors"
                      onClick={() => handleSort(field.path)}
                    >
                      <div className="flex items-center gap-2">
                        <span>{displayName}</span>
                        {isSorted && (
                          <span>
                            {sortConfig.direction === 'asc' ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, index) => (
              <tr
                key={index}
                className="border-b border-dark-border hover:bg-dark-bg transition-colors"
              >
                {widget.selectedFields.map((field) => {
                  // Extract the field name from the path
                  // If path is like "trending_stocks.top_gainers[0].ticker_id", extract "ticker_id"
                  // If path is like "ticker_id", use it directly
                  let fieldPath = field.path;
                  
                  // Handle array notation: "path[0].field" -> "field"
                  if (fieldPath.includes('[') && fieldPath.includes(']')) {
                    const afterBracket = fieldPath.split(']')[1];
                    if (afterBracket) {
                      fieldPath = afterBracket.replace(/^\./, ''); // Remove leading dot
                    }
                  }
                  
                  // If still a nested path, try to get the last part
                  // But first check if the row has the field directly
                  if (row && typeof row === 'object') {
                    // Try direct access first (most common case)
                    if (fieldPath in row) {
                      const value = row[fieldPath];
                      return (
                        <td key={field.path} className="p-3 text-sm text-dark-text">
                          {value !== null && value !== undefined ? String(value) : 'N/A'}
                        </td>
                      );
                    }
                    
                    // Try with just the last part of the path
                    const pathParts = fieldPath.split('.');
                    const lastPart = pathParts[pathParts.length - 1];
                    if (lastPart in row && lastPart !== fieldPath) {
                      const value = row[lastPart];
                      return (
                        <td key={field.path} className="p-3 text-sm text-dark-text">
                          {value !== null && value !== undefined ? String(value) : 'N/A'}
                        </td>
                      );
                    }
                  }
                  
                  // Fallback to nested value extraction
                  const value = getNestedValue(row, fieldPath);
                  
                  // Apply formatting if specified
                  const formattedValue = field.format
                    ? formatFieldValue(value, field, widget.detectedCurrency?.symbol)
                    : (value !== null && value !== undefined ? String(value) : 'N/A');
                  
                  return (
                    <td key={field.path} className="p-3 text-sm text-dark-text">
                      {formattedValue}
                    </td>
                  );
                })}
              </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex items-center justify-between pt-4 border-t border-dark-border">
        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-dark-muted">Show:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-3 py-1 bg-dark-bg border border-dark-border rounded text-dark-text text-sm focus:outline-none focus:border-primary"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-dark-muted">items per page</span>
        </div>

        {/* Page navigation */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-dark-muted">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredAndSortedData.length)} of {filteredAndSortedData.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 hover:bg-dark-bg rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4 text-dark-muted" />
            </button>
            <span className="text-sm text-dark-text px-2">
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-1.5 hover:bg-dark-bg rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next page"
            >
              <ChevronRight className="w-4 h-4 text-dark-muted" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

