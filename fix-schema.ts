// CORREÇÃO DO SCHEMA - Email opcional
export const insertUserSchema = z.object({
  username: z.string().min(1, "Nome de usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
  email: z.string().email("Email inválido").optional().or(z.literal('')).default(''),
  name: z.string().optional().default(''),
  phone: z.string().optional().default(''),
});
