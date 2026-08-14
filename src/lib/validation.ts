/**
 * Input validation utilities for server-side request validation
 * Prevents malicious or malformed input from reaching the database
 */

export interface ValidationError {
  field: string;
  message: string;
}

export class ValidationException extends Error {
  constructor(public errors: ValidationError[]) {
    super("Validation failed");
    this.name = "ValidationException";
  }
}

/**
 * Validates that a string is not empty and within length bounds
 */
export function validateString(
  value: unknown,
  fieldName: string,
  options: { minLength?: number; maxLength?: number; required?: boolean } = {}
): void {
  const { minLength = 1, maxLength = 1000, required = true } = options;
  
  if (!required && (value === null || value === undefined || value === "")) {
    return;
  }
  
  if (required && (value === null || value === undefined || value === "")) {
    throw new ValidationException([{ field: fieldName, message: `${fieldName} is required` }]);
  }
  
  if (typeof value !== "string") {
    throw new ValidationException([{ field: fieldName, message: `${fieldName} must be a string` }]);
  }
  
  if (value.length < minLength) {
    throw new ValidationException([{ field: fieldName, message: `${fieldName} must be at least ${minLength} characters` }]);
  }
  
  if (value.length > maxLength) {
    throw new ValidationException([{ field: fieldName, message: `${fieldName} must be less than ${maxLength} characters` }]);
  }
}

/**
 * Validates that a number is within bounds
 */
export function validateNumber(
  value: unknown,
  fieldName: string,
  options: { min?: number; max?: number; required?: boolean; integer?: boolean } = {}
): void {
  const { min, max, required = true, integer = false } = options;
  
  if (!required && (value === null || value === undefined)) {
    return;
  }
  
  if (required && (value === null || value === undefined)) {
    throw new ValidationException([{ field: fieldName, message: `${fieldName} is required` }]);
  }
  
  const num = typeof value === "number" ? value : parseFloat(value as string);
  
  if (isNaN(num)) {
    throw new ValidationException([{ field: fieldName, message: `${fieldName} must be a valid number` }]);
  }
  
  if (integer && !Number.isInteger(num)) {
    throw new ValidationException([{ field: fieldName, message: `${fieldName} must be an integer` }]);
  }
  
  if (min !== undefined && num < min) {
    throw new ValidationException([{ field: fieldName, message: `${fieldName} must be at least ${min}` }]);
  }
  
  if (max !== undefined && num > max) {
    throw new ValidationException([{ field: fieldName, message: `${fieldName} must be at most ${max}` }]);
  }
}

/**
 * Validates that a value is a valid UUID
 */
export function validateUUID(value: unknown, fieldName: string, required = true): void {
  if (!required && (value === null || value === undefined)) {
    return;
  }
  
  if (required && (value === null || value === undefined)) {
    throw new ValidationException([{ field: fieldName, message: `${fieldName} is required` }]);
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value as string)) {
    throw new ValidationException([{ field: fieldName, message: `${fieldName} must be a valid UUID` }]);
  }
}

/**
 * Validates that a value is a valid email
 */
export function validateEmail(value: unknown, fieldName: string, required = true): void {
  if (!required && (value === null || value === undefined || value === "")) {
    return;
  }
  
  if (required && (value === null || value === undefined || value === "")) {
    throw new ValidationException([{ field: fieldName, message: `${fieldName} is required` }]);
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value as string)) {
    throw new ValidationException([{ field: fieldName, message: `${fieldName} must be a valid email` }]);
  }
}

/**
 * Validates that a value is one of the allowed values
 */
export function validateEnum<T extends string>(
  value: unknown,
  fieldName: string,
  allowedValues: readonly T[],
  required = true
): void {
  if (!required && (value === null || value === undefined)) {
    return;
  }
  
  if (required && (value === null || value === undefined)) {
    throw new ValidationException([{ field: fieldName, message: `${fieldName} is required` }]);
  }
  
  if (!allowedValues.includes(value as T)) {
    throw new ValidationException([
      { field: fieldName, message: `${fieldName} must be one of: ${allowedValues.join(", ")}` },
    ]);
  }
}

/**
 * Validates a date string
 */
export function validateDate(value: unknown, fieldName: string, required = true): void {
  if (!required && (value === null || value === undefined)) {
    return;
  }
  
  if (required && (value === null || value === undefined)) {
    throw new ValidationException([{ field: fieldName, message: `${fieldName} is required` }]);
  }
  
  const date = new Date(value as string);
  if (isNaN(date.getTime())) {
    throw new ValidationException([{ field: fieldName, message: `${fieldName} must be a valid date` }]);
  }
}

/**
 * Validates an array
 */
export function validateArray(
  value: unknown,
  fieldName: string,
  options: { minLength?: number; maxLength?: number; required?: boolean } = {}
): void {
  const { minLength = 0, maxLength = 100, required = true } = options;
  
  if (!required && (value === null || value === undefined)) {
    return;
  }
  
  if (required && (value === null || value === undefined)) {
    throw new ValidationException([{ field: fieldName, message: `${fieldName} is required` }]);
  }
  
  if (!Array.isArray(value)) {
    throw new ValidationException([{ field: fieldName, message: `${fieldName} must be an array` }]);
  }
  
  if (value.length < minLength) {
    throw new ValidationException([{ field: fieldName, message: `${fieldName} must have at least ${minLength} items` }]);
  }
  
  if (value.length > maxLength) {
    throw new ValidationException([{ field: fieldName, message: `${fieldName} must have at most ${maxLength} items` }]);
  }
}

/**
 * Sanitizes a string to prevent XSS
 * Replaces HTML special characters with their entity equivalents
 */
export function sanitizeString(value: string): string {
  return value
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Validates JSON object
 */
export function validateObject(value: unknown, fieldName: string, required = true): void {
  if (!required && (value === null || value === undefined)) {
    return;
  }
  
  if (required && (value === null || value === undefined)) {
    throw new ValidationException([{ field: fieldName, message: `${fieldName} is required` }]);
  }
  
  if (typeof value !== "object" || Array.isArray(value) || value === null) {
    throw new ValidationException([{ field: fieldName, message: `${fieldName} must be an object` }]);
  }
}