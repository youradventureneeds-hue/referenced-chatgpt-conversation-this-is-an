-- Employers do not always state a work type. Preserve unknown values explicitly.
ALTER TYPE "WorkType" ADD VALUE IF NOT EXISTS 'UNSPECIFIED';
