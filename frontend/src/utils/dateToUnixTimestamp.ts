/**
 * Converts a date string to a Unix timestamp (seconds).
 * @param datetimeString - The date string in a format parseable by Date constructor
 * @returns Unix timestamp in seconds
 */
export const dateToUnixTimestamp = (datetimeString: string): number => {
  const date = new Date(datetimeString);
  return Math.floor(date.getTime() / 1000);
};
