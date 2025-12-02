import React, { useState } from 'react';
import { useData, Technician } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Edit2, Trash2, Phone, Mail, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';

const technicianSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  especialidade: z.string().min(1, "Especialidade é obrigatória"),
  telefone: z.string().min(1, "Telefone é obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal('')),
  status: z.string(),
});

export default function TechniciansPage() {
  const { technicians, addTechnician, updateTechnician, deleteTechnician } = useData();
  const [filter, setFilter] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);

  const filteredTechnicians = technicians.filter(t => 
    t.nome.toLowerCase().includes(filter.toLowerCase()) ||
    t.especialidade.toLowerCase().includes(filter.toLowerCase())
  );

  const form = useForm<z.infer<typeof technicianSchema>>({
    resolver: zodResolver(technicianSchema),
    defaultValues: {
      nome: '',
      especialidade: '',
      telefone: '',
      email: '',
      status: 'ATIVO'
    }
  });

  const onSubmit = (data: z.infer<typeof technicianSchema>) => {
    const formattedData = {
      ...data,
      status: data.status as 'ATIVO' | 'INATIVO'
    };

    if (editingTechnician) {
      updateTechnician(editingTechnician.id, formattedData);
    } else {
      addTechnician(formattedData);
    }
    setIsDialogOpen(false);
    setEditingTechnician(null);
    form.reset();
  };

  const handleEdit = (tech: Technician) => {
    setEditingTechnician(tech);
    form.reset(tech);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingTechnician(null);
    form.reset({
      nome: '',
      especialidade: '',
      telefone: '',
      email: '',
      status: 'ATIVO'
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Técnicos</h1>
          <p className="text-muted-foreground">Gerencie a equipe de manutenção.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew} className="gap-2 shadow-md">
              <Plus className="h-4 w-4" /> Novo Técnico
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingTechnician ? 'Editar Técnico' : 'Cadastrar Novo Técnico'}</DialogTitle>
              <DialogDescription>
                Preencha as informações do profissional.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: João Silva" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="especialidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Especialidade</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Refrigeração, Elétrica..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input placeholder="(00) 00000-0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="email@exemplo.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ATIVO">Ativo</SelectItem>
                          <SelectItem value="INATIVO">Inativo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="submit" className="w-full md:w-auto">
                    {editingTechnician ? 'Salvar Alterações' : 'Cadastrar Técnico'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2 bg-card p-2 rounded-md border shadow-sm">
        <Search className="w-4 h-4 text-muted-foreground ml-2" />
        <Input 
          placeholder="Buscar por nome ou especialidade..." 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border-0 focus-visible:ring-0 shadow-none"
        />
      </div>

      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nome</TableHead>
              <TableHead>Especialidade</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTechnicians.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum técnico encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredTechnicians.map((tech) => (
                <TableRow key={tech.id} className="group hover:bg-muted/50 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {tech.nome.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium">{tech.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell>{tech.especialidade}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="w-3 h-3" /> {tech.telefone}
                      </span>
                      {tech.email && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="w-3 h-3" /> {tech.email}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                      tech.status === 'ATIVO' 
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                    )}>
                      {tech.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(tech)} title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => deleteTechnician(tech.id)} title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
