import {CandidatePasswordReset} from '@/components/candidate-password-reset';
import '@/components/employer.css';
export const metadata={title:'Reset candidate password | The Great Indian Outdoors',robots:{index:false,follow:false},referrer:'no-referrer' as const};
export default function ResetPasswordPage(){return <main className="section employer-section"><p className="eyebrow">CANDIDATE ACCOUNT</p><h1>Reset your password.</h1><CandidatePasswordReset/></main>;}
