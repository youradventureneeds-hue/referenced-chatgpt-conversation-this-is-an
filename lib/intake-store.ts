import { demoIntake, type IntakeItem, type IntakeStatus } from "./intake";
export const intakeStore: IntakeItem[] = [...demoIntake];
export function updateIntake(id: string, status: IntakeStatus, reviewNotes?: string) { const item = intakeStore.find(entry => entry.id === id); if (!item) return undefined; item.status = status; item.reviewNotes = reviewNotes; return item; }
