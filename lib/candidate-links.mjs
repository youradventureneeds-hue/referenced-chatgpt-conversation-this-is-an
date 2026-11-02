export function accountReturnPath(value,fallback='/candidate/dashboard'){return typeof value==='string'&&(value==='/forum'||/^\/(?:jobs|forum)\/[a-zA-Z0-9_-]+$/.test(value))?value:fallback;}
export const candidateReturnPath=value=>accountReturnPath(value,'/candidate/dashboard');
export const candidateStatusLabels={PLANNED:'Planning to apply',APPLIED:'Applied externally',INTERVIEW:'Interview',OFFER:'Offer received',NOT_SELECTED:'Not selected',WITHDRAWN:'Withdrawn'};
