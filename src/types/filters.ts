/**
 * Filter Type Definitions
 * 
 * Defines filter types and configurations for table widget columns.
 * Allows users to filter table data by different criteria.
 */

// Available filter types for table columns
export type FilterType = 'text' | 'number' | 'date' | 'select' | 'multiselect';

/**
 * Configuration for filtering a single column
 * Contains filter type and applicable filter values
 */
export interface ColumnFilter {
  fieldPath: string; // Path to the field being filtered
  filterType: FilterType; // Type of filter to apply
  value?: any; // Filter value (for text/select filters)
  // For number filters - range filtering
  min?: number; // Minimum value
  max?: number; // Maximum value
  // For date filters - date range filtering
  dateFrom?: string; // Start date (ISO format)
  dateTo?: string; // End date (ISO format)
  // For select/multiselect filters - option-based filtering
  options?: string[]; // Available options for selection
  selectedOptions?: string[]; // Selected options (for multiselect)
}

/**
 * State object containing all active column filters
 * Keyed by field path for easy lookup
 */
export interface FilterState {
  [fieldPath: string]: ColumnFilter; // Map of field paths to their filter configurations
}



