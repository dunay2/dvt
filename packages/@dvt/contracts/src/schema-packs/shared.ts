import { z } from 'zod';

export const HexSha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
