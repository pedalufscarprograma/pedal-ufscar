import { LostReportType } from '../entities/lost-report.entity';

export class CreateLostReportDto {
  loanId!: string;
  userId!: string;
  type!: LostReportType;
  description!: string;
  occurrenceDocumentUrl?: string | null;
}