import {PrismaClient} from '@prisma/client';import {PrismaPg} from '@prisma/adapter-pg';
const schema=process.env.EMPLOYER_TEST_SCHEMA;if(!/^employer_check_[a-f0-9]{12}$/.test(schema||''))throw Error('An isolated test schema is required');
export const prisma=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL,max:2},{schema})});
