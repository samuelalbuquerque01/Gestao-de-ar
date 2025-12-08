import React, { useState } from 'react';
import { useData, type Machine, type MachineType, type LocationType, type MachineStatus } from '@/lib/data';
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Filter, Edit2, Trash2, MapPin, Power, Building2, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { format } from 'date-fns';

const machineSchema = z.object({
  codigo: z.string().min(1, "Código é obrigatório"),
  modelo: z.string().min(1, "Modelo é obrigatório"),
  marca: z.string().min(1, "Marca é obrigatória"),
  tipo: z.string(),
  capacidadeBTU: z.coerce.number().min(1000, "Capacidade inválida"),
  voltagem: z.string(),
  localizacaoTipo: z.string(),
  localizacaoDescricao: z.string().min(1, "Localização é obrigatória"),
  localizacaoAndar: z.coerce.number().optional(),
  filial: z.string().min(1, "Filial é obrigatória"),
  dataInstalacao: z.string().min(1, "Data é obrigatória"),
  status: z.string(),
  observacoes: z.string().optional(),
});

export default function MachinesPage() {
  const { machines, isLoadingMachines, isLoadingMachinesInitial, createMachine, updateMachine, deleteMachine } = useData();
  const [filter, setFilter] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const filteredMachines = machines.filter(m => 
    m.codigo.toLowerCase().includes(filter.toLowerCase()) ||
    m.localizacaoDescricao.toLowerCase().includes(filter.toLowerCase()) ||
    m.filial.toLowerCase().includes(filter.toLowerCase()) ||
    m.marca.toLowerCase().includes(filter.toLowerCase())
  );

  const form = useForm<z.infer<typeof machineSchema>>({
    resolver: zodResolver(machineSchema),
    defaultValues: {
      codigo: '',
      modelo: '',
      marca: '',
      tipo: 'SPLIT',
      capacidadeBTU: 9000,
      voltagem: 'V220',
      localizacaoTipo: 'SALA',
      localizacaoDescricao: '',
      localizacaoAndar: 0,
      filial: '',
      dataInstalacao: new Date().toISOString().split('T')[0],
      status: 'ATIVO',
      observacoes: ''
    }
  });

  const onSubmit = async (data: z.infer<typeof machineSchema>) => {
    const formattedData = {
      ...data,
      tipo: data.tipo as MachineType,
      voltagem: data.voltagem as 'V110' | 'V220' | 'BIVOLT',
      localizacaoTipo: data.localizacaoTipo as LocationType,
      status: data.status as MachineStatus
    };

    try {
      if (editingMachine) {
        await updateMachine(editingMachine.id, formattedData);
      } else {
        await createMachine(formattedData);
      }
      setIsDialogOpen(false);
      setEditingMachine(null);
      form.reset();
    } catch (error) {
      console.error('Erro ao salvar máquina:', error);
    }
  };

  const handleEdit = (machine: Machine) => {
    setEditingMachine(machine);
    form.reset({
      ...machine,
      dataInstalacao: machine.dataInstalacao ? machine.dataInstalacao.split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingMachine(null);
    form.reset({
      codigo: '',
      modelo: '',
      marca: '',
      tipo: 'SPLIT',
      capacidadeBTU: 9000,
      voltagem: 'V220',
      localizacaoTipo: 'SALA',
      localizacaoDescricao: '',
      localizacaoAndar: 0,
      filial: '',
      dataInstalacao: new Date().toISOString().split('T')[0],
      status: 'ATIVO',
      observacoes: ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta máquina?')) return;
    
    setIsDeleting(id);
    try {
      await deleteMachine(id);
    } catch (error) {
      console.error('Erro ao deletar máquina:', error);
    } finally {
      setIsDeleting(null);
    }
  };

  const statusColors: Record<string, string> = {
    'ATIVO': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    'INATIVO': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    'MANUTENCAO': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    'DEFEITO': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
  };

  // Loading state para máquinas
  if (isLoadingMachinesInitial) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <div>
            <h3 className="text-lg font-medium">Carregando máquinas</h3>
            <p className="text-sm text-muted-foreground">Por favor, aguarde...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingMachines && machines.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Máquinas</h1>
            <p className="text-muted-foreground">Gerencie o inventário de ar condicionados.</p>
          </div>
          <Button disabled className="gap-2 shadow-md">
            <Plus className="h-4 w-4" /> Nova Máquina
          </Button>
        </div>

        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-muted/30 animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Máquinas</h1>
          <p className="text-muted-foreground">Gerencie o inventário de ar condicionados e suas localizações.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew} className="gap-2 shadow-md">
              <Plus className="h-4 w-4" /> Nova Máquina
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingMachine ? 'Editar Máquina' : 'Cadastrar Nova Máquina'}</DialogTitle>
              <DialogDescription>
                Preencha as informações do equipamento abaixo.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="codigo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código (Tag)</FormLabel>
                        <FormControl>
                          <Input placeholder="EX: AC-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="marca"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marca</FormLabel>
                        <FormControl>
                          <Input placeholder="EX: LG" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="modelo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Modelo</FormLabel>
                        <FormControl>
                          <Input placeholder="EX: Dual Inverter" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tipo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="SPLIT">Split</SelectItem>
                            <SelectItem value="WINDOW">Window (Janela)</SelectItem>
                            <SelectItem value="CASSETE">Cassete</SelectItem>
                            <SelectItem value="PISO_TETO">Piso Teto</SelectItem>
                            <SelectItem value="PORTATIL">Portátil</SelectItem>
                            <SelectItem value="INVERTER">Inverter</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="capacidadeBTU"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Capacidade (BTU)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="voltagem"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Voltagem</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="V110">110V</SelectItem>
                            <SelectItem value="V220">220V</SelectItem>
                            <SelectItem value="BIVOLT">Bivolt</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="md:col-span-2 border-t pt-4 mt-2">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Localização e Filial
                    </h4>
                  </div>

                  <FormField
                    control={form.control}
                    name="filial"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Filial</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Matriz, Filial Centro..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="localizacaoTipo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Local</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="SALA">Sala</SelectItem>
                            <SelectItem value="QUARTO">Quarto</SelectItem>
                            <SelectItem value="ESCRITORIO">Escritório</SelectItem>
                            <SelectItem value="SALA_REUNIAO">Sala de Reunião</SelectItem>
                            <SelectItem value="OUTRO">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="localizacaoDescricao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição / Nome da Sala</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Sala 304 - Bloco B" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="localizacaoAndar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Andar</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} value={field.value || 0} />
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
                        <FormLabel>Status Atual</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ATIVO">Ativo</SelectItem>
                            <SelectItem value="MANUTENCAO">Em Manutenção</SelectItem>
                            <SelectItem value="DEFEITO">Com Defeito</SelectItem>
                            <SelectItem value="INATIVO">Inativo</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dataInstalacao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Instalação</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="observacoes"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Observações adicionais..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full md:w-auto">
                    {editingMachine ? 'Salvar Alterações' : 'Cadastrar Máquina'}
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
          placeholder="Buscar por código, marca, local ou filial..." 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border-0 focus-visible:ring-0 shadow-none"
        />
        <Button variant="ghost" size="icon">
          <Filter className="w-4 h-4 text-muted-foreground" />
        </Button>
      </div>

      {filteredMachines.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-card">
          <p className="text-muted-foreground">
            {filter ? 'Nenhuma máquina encontrada com esse filtro.' : 'Nenhuma máquina cadastrada.'}
          </p>
        </div>
      ) : (
        <div className="rounded-md border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Código</TableHead>
                <TableHead>Equipamento</TableHead>
                <TableHead className="hidden md:table-cell">Localização</TableHead>
                <TableHead className="hidden md:table-cell">Filial</TableHead>
                <TableHead className="hidden sm:table-cell">Capacidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMachines.map((machine) => (
                <TableRow key={machine.id} className="group hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium font-mono text-primary">
                    {machine.codigo}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{machine.modelo}</span>
                      <span className="text-xs text-muted-foreground">{machine.marca} • {machine.tipo}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-col">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-muted-foreground" /> 
                        {machine.localizacaoDescricao}
                      </span>
                      {machine.localizacaoAndar !== undefined && machine.localizacaoAndar > 0 && (
                         <span className="text-xs text-muted-foreground pl-4">{machine.localizacaoAndar}º Andar</span>
                      )}
                    </div>
                  </TableCell>
                   <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-1">
                       <Building2 className="w-3 h-3 text-muted-foreground" />
                       {machine.filial}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {machine.capacidadeBTU ? machine.capacidadeBTU.toLocaleString() : 0} BTU
                    <span className="block text-xs text-muted-foreground">
                      {machine.voltagem ? machine.voltagem.replace('V', '') : '220'}V
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[machine.status] || 'bg-gray-100 text-gray-800'}`}>
                      {machine.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleEdit(machine)} 
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:text-destructive hover:bg-destructive/10" 
                        onClick={() => handleDelete(machine.id)} 
                        title="Excluir"
                        disabled={isDeleting === machine.id}
                      >
                        {isDeleting === machine.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}