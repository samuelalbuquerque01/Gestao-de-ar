import React, { useState } from 'react';
import { useData, Service, ServiceType, ServiceStatus, Priority } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Filter, Calendar, Clock, User, AlertTriangle, CheckCircle, PenTool } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const serviceSchema = z.object({
  tipoServico: z.string(),
  maquinaId: z.string().min(1, "Máquina é obrigatória"),
  dataAgendamento: z.string().min(1, "Data é obrigatória"),
  horaAgendamento: z.string().optional(),
  tecnicoId: z.string().min(1, "Técnico é obrigatório"),
  descricaoServico: z.string().min(1, "Descrição é obrigatória"),
  descricaoProblema: z.string().optional(),
  prioridade: z.string(),
  status: z.string(),
  observacoes: z.string().optional(),
});

export default function ServicesPage() {
  // CORREÇÃO: Mude addService para createService
  const { services, machines, technicians, createService, updateService, deleteService } = useData();
  const [filter, setFilter] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const filteredServices = services.filter(s => {
    const machine = machines.find(m => m.id === s.maquinaId);
    const searchStr = filter.toLowerCase();
    return (
      s.tecnicoNome.toLowerCase().includes(searchStr) ||
      s.descricaoServico.toLowerCase().includes(searchStr) ||
      (machine && machine.codigo.toLowerCase().includes(searchStr))
    );
  });

  const form = useForm<z.infer<typeof serviceSchema>>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      tipoServico: 'PREVENTIVA',
      maquinaId: '',
      dataAgendamento: new Date().toISOString().split('T')[0],
      horaAgendamento: '08:00',
      tecnicoId: '',
      descricaoServico: '',
      descricaoProblema: '',
      prioridade: 'MEDIA',
      status: 'AGENDADO',
      observacoes: ''
    }
  });

  const onSubmit = (data: z.infer<typeof serviceSchema>) => {
    // Combine date and time
    const dateTime = new Date(`${data.dataAgendamento}T${data.horaAgendamento || '00:00'}:00`).toISOString();
    
    const selectedTech = technicians.find(t => t.id === data.tecnicoId);

    const formattedData = {
      ...data,
      dataAgendamento: dateTime,
      tecnicoNome: selectedTech ? selectedTech.nome : 'Desconhecido',
      tipoServico: data.tipoServico as ServiceType,
      prioridade: data.prioridade as Priority,
      status: data.status as ServiceStatus
    };

    if (editingService) {
      updateService(editingService.id, formattedData);
    } else {
      // CORREÇÃO: Mude addService para createService
      createService(formattedData);
    }
    setIsDialogOpen(false);
    setEditingService(null);
    form.reset();
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    const dateObj = new Date(service.dataAgendamento);
    form.reset({
      ...service,
      tecnicoId: service.tecnicoId || '', // Handle legacy records
      dataAgendamento: dateObj.toISOString().split('T')[0],
      horaAgendamento: dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      maquinaId: service.maquinaId
    });
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingService(null);
    form.reset({
      tipoServico: 'PREVENTIVA',
      maquinaId: '',
      dataAgendamento: new Date().toISOString().split('T')[0],
      horaAgendamento: '08:00',
      tecnicoId: '',
      descricaoServico: '',
      descricaoProblema: '',
      prioridade: 'MEDIA',
      status: 'AGENDADO',
      observacoes: ''
    });
    setIsDialogOpen(true);
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'URGENTE': return 'text-red-600 bg-red-100 border-red-200';
      case 'ALTA': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'MEDIA': return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'BAIXA': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Serviços</h1>
          <p className="text-muted-foreground">Gerencie ordens de serviço, manutenções e instalações.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew} className="gap-2 shadow-md">
              <Plus className="h-4 w-4" /> Novo Serviço
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingService ? 'Editar Serviço' : 'Agendar Novo Serviço'}</DialogTitle>
              <DialogDescription>
                Detalhes da ordem de serviço.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="maquinaId"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Máquina</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a máquina" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {machines.map(m => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.codigo} - {m.modelo} ({m.filial})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tipoServico"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Serviço</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PREVENTIVA">Preventiva</SelectItem>
                            <SelectItem value="CORRETIVA">Corretiva</SelectItem>
                            <SelectItem value="INSTALACAO">Instalação</SelectItem>
                            <SelectItem value="LIMPEZA">Limpeza</SelectItem>
                            <SelectItem value="VISTORIA">Vistoria</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="prioridade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prioridade</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="BAIXA">Baixa</SelectItem>
                            <SelectItem value="MEDIA">Média</SelectItem>
                            <SelectItem value="ALTA">Alta</SelectItem>
                            <SelectItem value="URGENTE">Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dataAgendamento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Agendada</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="horaAgendamento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Horário</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tecnicoId"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Técnico Responsável</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o técnico" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {technicians.map(t => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.nome} - {t.especialidade}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="descricaoServico"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Descrição do Serviço</FormLabel>
                        <FormControl>
                          <Textarea placeholder="O que será feito..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch('tipoServico') === 'CORRETIVA' && (
                    <FormField
                      control={form.control}
                      name="descricaoProblema"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Descrição do Problema (Defeito)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="O que está acontecendo..." className="bg-red-50 dark:bg-red-900/10" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

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
                            <SelectItem value="AGENDADO">Agendado</SelectItem>
                            <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                            <SelectItem value="CONCLUIDO">Concluído</SelectItem>
                            <SelectItem value="CANCELADO">Cancelado</SelectItem>
                            <SelectItem value="PENDENTE">Pendente</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full md:w-auto">
                    {editingService ? 'Salvar Alterações' : 'Agendar Serviço'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 bg-card p-2 rounded-md border shadow-sm">
        <Search className="w-4 h-4 text-muted-foreground ml-2" />
        <Input 
          placeholder="Buscar por técnico, serviço ou máquina..." 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border-0 focus-visible:ring-0 shadow-none"
        />
      </div>

      {/* Kanban-like List or Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredServices.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground bg-card border rounded-lg border-dashed">
            Nenhum serviço encontrado com os filtros atuais.
          </div>
        ) : (
          filteredServices.map((service) => {
            const machine = machines.find(m => m.id === service.maquinaId);
            return (
              <div 
                key={service.id} 
                className={cn(
                  "flex flex-col p-5 rounded-xl border bg-card shadow-sm transition-all hover:shadow-md group relative overflow-hidden",
                  service.status === 'CONCLUIDO' && "opacity-75 hover:opacity-100"
                )}
              >
                {/* Priority Stripe */}
                <div className={cn(
                  "absolute left-0 top-0 bottom-0 w-1.5",
                  service.prioridade === 'URGENTE' ? "bg-red-500" :
                  service.prioridade === 'ALTA' ? "bg-orange-500" :
                  service.prioridade === 'MEDIA' ? "bg-blue-500" : "bg-green-500"
                )} />

                <div className="flex justify-between items-start mb-3 pl-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-muted-foreground tracking-wider uppercase">
                        {service.tipoServico}
                      </span>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium", getPriorityColor(service.prioridade))}>
                        {service.prioridade}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg leading-tight">{service.descricaoServico}</h3>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => handleEdit(service)}>
                    <PenTool className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2 pl-2 flex-1">
                  {machine && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="p-1 bg-secondary rounded">
                        <span className="font-mono text-xs text-foreground">{machine.codigo}</span>
                      </div>
                      <span className="truncate">{machine.localizacaoDescricao} ({machine.filial})</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{format(new Date(service.dataAgendamento), "dd/MM/yyyy 'às' HH:mm")}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span>{service.tecnicoNome}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t pl-2 flex justify-between items-center">
                  <span className={cn(
                    "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                    service.status === 'CONCLUIDO' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                    service.status === 'EM_ANDAMENTO' ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                    service.status === 'CANCELADO' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  )}>
                    {service.status === 'CONCLUIDO' && <CheckCircle className="w-3 h-3" />}
                    {service.status === 'EM_ANDAMENTO' && <Clock className="w-3 h-3" />}
                    {service.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}