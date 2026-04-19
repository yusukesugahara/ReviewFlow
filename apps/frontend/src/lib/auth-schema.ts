import { z } from "zod";

export const authCredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type AuthCredentials = z.infer<typeof authCredentialsSchema>;
