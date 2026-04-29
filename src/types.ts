export interface ScheduleEvent {
  id: string;
  asset: string;
  liveDate: string; // Original string: Fri-1-May
  parsedDate: Date;
  liveTime: string;
  endTime: string;
  kolName: string;
  studio: string;
  tech1: string;
  tech2: string;
  tech3: string;
  leaveStatus: string;
  note: string;
}

export interface CSVRow {
  Asset: string;
  'Live Date': string;
  'Live Time': string;
  'End Time': string;
  'KOL name': string;
  Studio: string;
  'Tech 1': string;
  'Tech 2': string;
  'Tech 3': string;
  'Leave = ไม่แยู่': string;
  Note: string;
}
