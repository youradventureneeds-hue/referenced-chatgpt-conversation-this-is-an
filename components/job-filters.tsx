'use client';

import type {ChangeEvent, KeyboardEvent} from 'react';
import Link from 'next/link';

type JobFiltersProps={q:string;category:string;country:string;type:string;visa:boolean;countries:string[];categories:Array<{value:string;label:string;count:number}>};

function submitWhenChanged(event:ChangeEvent<HTMLSelectElement|HTMLInputElement>){event.currentTarget.form?.requestSubmit();}

export function JobFilters({q,category,country,type,visa,countries,categories}:JobFiltersProps){
 function submitSearchOnEnter(event:KeyboardEvent<HTMLInputElement>){if(event.key==='Enter'){event.preventDefault();event.currentTarget.form?.requestSubmit();}}
 return <form method="GET" action="/jobs" className="filters job-filters">
  <label>Search<input name="q" defaultValue={q} placeholder="Role or organization" maxLength={200} onKeyDown={submitSearchOnEnter}/></label>
  <label>Job category<select name="category" defaultValue={category} onChange={submitWhenChanged}><option value="all">All job categories</option>{categories.map(item=><option key={item.value} value={item.value}>{item.label} ({item.count})</option>)}</select></label>
  <label>Country<select name="country" defaultValue={country} onChange={submitWhenChanged}><option value="all">Any country</option>{countries.map(value=><option key={value} value={value}>{value}</option>)}</select></label>
  <label>Work type<select name="type" defaultValue={type} onChange={submitWhenChanged}><option value="all">Any work type</option><option value="FULL_TIME">Full time</option><option value="PART_TIME">Part time</option><option value="SEASONAL">Seasonal</option><option value="GAP_YEAR">Gap year</option><option value="INTERNSHIP">Internship</option><option value="VOLUNTEER">Volunteer</option><option value="UNSPECIFIED">Not specified</option></select></label>
  <label className="job-visa-filter"><input type="checkbox" name="visa" defaultChecked={visa} onChange={submitWhenChanged}/> Visa sponsorship</label>
  <Link className="text-link" href="/jobs">Clear filters</Link>
 </form>;
}
