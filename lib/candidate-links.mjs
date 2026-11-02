export function candidateReturnPath(value){return typeof value==='string'&&/^\/jobs\/[a-zA-Z0-9_-]+$/.test(value)?value:'/candidate/dashboard';}
export const candidateStatusLabels={PLANNED:'Planning to apply',APPLIED:'Applied externally',INTERVIEW:'Interview',OFFER:'Offer received',NOT_SELECTED:'Not selected',WITHDRAWN:'Withdrawn'};
