import React, { useState, useEffect } from 'react';
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
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

const serviceSchema = z.object({
  tipoServico: z.string(),
  maquinaId: z.string().min(1, "Máquina é obrigatória"),
  dataAgendamento: z.string().min(1, "Data é obrigatória"),
  horaAgendamento: z.string().min(1, "Hora é obrigatória"),
  tecnicoId: z.string().min(1, "Técnico é obrigatório"),
  descricaoServico: z.string().min(1, "Descrição é obrigatória"),
  descricaoProblema: z.string().optional(),
  prioridade: z.string(),
  status: z.string(),
  observacoes: z.string().optional(),
});

export default function ServicesPage() {
  const { services, machines, technicians, createService, updateService, deleteService } = useData();
  const [filter, setFilter] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [machineSearch, setMachineSearch] = useState('');
  const [filteredMachines, setFilteredMachines] = useState(machines);

  useEffect(() => {
    if (machineSearch.trim() === '') {
      setFilteredMachines(machines);
    } else {
      const searchLower = machineSearch.toLowerCase();
      const filtered = machines.filter(m => 
        m.codigo.toLowerCase().includes(searchLower) ||
        m.modelo.toLowerCase().includes(searchLower) ||
        m.marca.toLowerCase().includes(searchLower) ||
        m.filial.toLowerCase().includes(searchLower) ||
        m.localizacaoDescricao.toLowerCase().includes(searchLower)
      );
      setFilteredMachines(filtered);
    }
  }, [machineSearch, machines]);

  const filteredServices = services.filter(s => {
    const machine = machines.find(m => m.id === s.maquinaId);
    const searchStr = filter.toLowerCase();
    return (
      s.tecnicoNome.toLowerCase().includes(searchStr) ||
      s.descricaoServico.toLowerCase().includes(searchStr) ||
      (machine && machine.codigo.toLowerCase().includes(searchStr)) ||
      (machine && machine.modelo.toLowerCase().includes(searchStr))
    );
  });

  const form = useForm<z.infer<typeof serviceSchema>>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      tipoServico: 'PREVENTIVA',
      maquinaId: '',
      dataAgendamento: format(new Date(), 'yyyy-MM-dd'),
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
    // CORREÇÃO: Criar data corretamente combinando data e hora
    const [year, month, day] = data.dataAgendamento.split('-').map(Number);
    const [hour, minute] = data.horaAgendamento.split(':').map(Number);
    
    const dateTime = new Date(year, month - 1, day, hour, minute);
    
    // Validar se a data é válida
    if (isNaN(dateTime.getTime())) {
      console.error('Data inválida:', data.dataAgendamento, data.horaAgendamento);
      return;
    }
    
    const selectedTech = technicians.find(t => t.id === data.tecnicoId);

    const formattedData = {
      tipoServico: data.tipoServico as ServiceType,
      maquinaId: data.maquinaId,
      dataAgendamento: dateTime.toISOString(), // CORREÇÃO: Usar ISO string
      tecnicoId: data.tecnicoId,
      tecnicoNome: selectedTech ? selectedTech.nome : 'Desconhecido',
      descricaoServico: data.descricaoServico,
      descricaoProblema: data.descricaoProblema,
      prioridade: data.prioridade as Priority,
      status: data.status as ServiceStatus,
      observacoes: data.observacoes
    };

    if (editingService) {
      updateService(editingService.id, formattedData);
    } else {
      createService(formattedData);
    }
    setIsDialogOpen(false);
    setEditingService(null);
    form.reset();
    setMachineSearch('');
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    
    // CORREÇÃO: Parsear corretamente a data do serviço
    let dateObj: Date;
    try {
      dateObj = parseISO(service.dataAgendamento);
      if (isNaN(dateObj.getTime())) {
        throw new Error('Data inválida');
      }
    } catch (error) {
      console.error('Erro ao parsear data do serviço:', error);
      dateObj = new Date(); // Fallback para data atual
    }
    
    form.reset({
      tipoServico: service.tipoServico,
      maquinaId: service.maquinaId,
      dataAgendamento: format(dateObj, 'yyyy-MM-dd'),
      horaAgendamento: format(dateObj, 'HH:mm'),
      tecnicoId: service.tecnicoId || '',
      descricaoServico: service.descricaoServico,
      descricaoProblema: service.descricaoProblema || '',
      prioridade: service.prioridade,
      status: service.status,
      observacoes: service.observacoes || ''
    });
    
    // Definir busca da máquina atual
    const machine = machines.find(m => m.id === service.maquinaId);
    if (machine) {
      setMachineSearch(`${machine.codigo} - ${machine.modelo}`);
    }
    
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingService(null);
    setMachineSearch('');
    form.reset({
      tipoServico: 'PREVENTIVA',
      maquinaId: '',
      dataAgendamento: format(new Date(), 'yyyy-MM-dd'),
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

  const handleMachineSelect = (machineId: string) => {
    form.setValue('maquinaId', machineId);
    const machine = machines.find(m => m.id === machineId);
    if (machine) {
      setMachineSearch(`${machine.codigo} - ${machine.modelo} (${machine.filial})`);
    }
  };

  const clearMachineSearch = () => {
    setMachineSearch('');
    form.setValue('maquinaId', '');
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
                  {/* Seletor de Máquina com Search */}
                  <FormField
                    control={form.control}
                    name="maquinaId"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Máquina *</FormLabel>
                        <div className="space-y-2">
                          <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Buscar máquina por código, modelo ou filial..."
                              value={machineSearch}
                              onChange={(e) => setMachineSearch(e.target.value)}
                              className="pl-9"
                            />
                            {machineSearch && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-2 top-2 h-6 w-6"
                                onClick={clearMachineSearch}
                              >
                                ×
                              </Button>
                            )}
                          </div>
                          
                          <div className="border rounded-md">
                            <ScrollArea className="h-48">
                              {filteredMachines.length === 0 ? (
                                <div className="p-4 text-center text-muted-foreground">
                                  Nenhuma máquina encontrada
                                </div>
                              ) : (
                                <div className="p-2 space-y-1">
                                  {filteredMachines.map(m => (
                                    <div
                                      key={m.id}
                                      className={`p-3 rounded-md cursor-pointer transition-colors hover:bg-muted ${field.value === m.id ? 'bg-primary/10 border border-primary' : ''}`}
                                      onClick={() => handleMachineSelect(m.id)}
                                    >
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="font-mono">
                                              {m.codigo}
                                            </Badge>
                                            <span className="font-medium">{m.modelo}</span>
                                          </div>
                                          <div className="text-sm text-muted-foreground mt-1">
                                            {m.marca} • {m.filial} • {m.localizacaoDescricao}
                                          </div>
                                        </div>
                                        {field.value === m.id && (
                                          <CheckCircle className="h-4 w-4 text-primary" />
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </ScrollArea>
                          </div>
                          
                          {field.value && (
                            <div className="text-sm text-muted-foreground">
                              Máquina selecionada: <span className="font-medium">
                                {machines.find(m => m.id === field.value)?.codigo} - {machines.find(m => m.id === field.value)?.modelo}
                              </span>
                            </div>
                          )}
                        </div>
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
                        <FormLabel>Data Agendada *</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            min={format(new Date(), 'yyyy-MM-dd')}
                          />
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
                        <FormLabel>Horário *</FormLabel>
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
                            <ScrollArea className="h-60">
                              {technicians.map(t => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.nome} - {t.especialidade}
                                </SelectItem>
                              ))}
                            </ScrollArea>
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
                        <FormLabel>Descrição do Serviço *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Descreva o serviço a ser realizado..." 
                            {...field} 
                            className="min-h-[100px]"
                          />
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
                            <Textarea 
                              placeholder="Descreva o problema identificado..." 
                              className="bg-red-50 dark:bg-red-900/10 min-h-[80px]" 
                              {...field} 
                            />
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

                  <FormField
                    control={form.control}
                    name="observacoes"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Observações adicionais..." 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingService(null);
                      setMachineSearch('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
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
          placeholder="Buscar por técnico, serviço, máquina ou código..." 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border-0 focus-visible:ring-0 shadow-none flex-1"
        />
        {filter && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setFilter('')}
            className="h-8 px-2"
          >
            Limpar
          </Button>
        )}
      </div>

      {/* Serviços */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredServices.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground bg-card border rounded-lg border-dashed">
            {filter ? 'Nenhum serviço encontrado com os filtros atuais.' : 'Nenhum serviço cadastrado ainda.'}
          </div>
        ) : (
          filteredServices.map((service) => {
            const machine = machines.find(m => m.id === service.maquinaId);
            
            // CORREÇÃO: Parsear data corretamente para exibição
            let serviceDate: Date;
            try {
              serviceDate = parseISO(service.dataAgendamento);
              if (isNaN(serviceDate.getTime())) {
                serviceDate = new Date();
              }
            } catch (error) {
              console.error('Erro ao parsear data do serviço para exibição:', error);
              serviceDate = new Date();
            }
            
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
                    <h3 className="font-semibold text-lg leading-tight line-clamp-2">
                      {service.descricaoServico}
                    </h3>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" 
                    onClick={() => handleEdit(service)}
                  >
                    <PenTool className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2 pl-2 flex-1">
                  {machine && (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="font-mono">
                        {machine.codigo}
                      </Badge>
                      <span className="text-muted-foreground truncate">
                        {machine.modelo} • {machine.filial}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span>{format(serviceDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4 flex-shrink-0" />
                    <span>{service.tecnicoNome}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t pl-2 flex justify-between items-center">
                  <Badge 
                    variant="secondary"
                    className={cn(
                      "font-medium",
                      service.status === 'CONCLUIDO' ? "bg-green-100 text-green-700 hover:bg-green-100" :
                      service.status === 'EM_ANDAMENTO' ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100" :
                      service.status === 'CANCELADO' ? "bg-red-100 text-red-700 hover:bg-red-100" :
                      "bg-slate-100 text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    {service.status === 'CONCLUIDO' && <CheckCircle className="w-3 h-3 mr-1" />}
                    {service.status === 'EM_ANDAMENTO' && <Clock className="w-3 h-3 mr-1" />}
                    {service.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}