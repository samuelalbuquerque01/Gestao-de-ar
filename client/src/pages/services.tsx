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
import { Plus, Search, Filter, Calendar, Clock, User, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const serviceSchema = z.object({
  tipoServico: z.string(),
  maquinaId: z.string().min(1, "Máquina é obrigatória"),
  dataAgendamento: z.string().min(1, "Data é obrigatória"),
  horaAgendamento: z.string(),
  tecnicoId: z.string().min(1, "Técnico é obrigatório"),
  descricaoServico: z.string().min(1, "Descrição é obrigatória"),
  descricaoProblema: z.string().optional(),
  prioridade: z.string(),
  status: z.string(),
  observacoes: z.string().optional(),
});

const formatServiceDate = (dateString: string): string => {  
  if (!dateString || dateString.trim() === '' || dateString === 'Invalid Date' || dateString.includes('Invalid Date')) {    return 'Data não informada';
  }
  
  try {
    if (dateString instanceof Date) {
      if (isValid(dateString)) {
        return format(dateString, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      }
      return 'Data inválida';
    }
    
    if (typeof dateString === 'string') {
      const cleanString = dateString.trim().replace(/["']/g, '');
      
      if (cleanString === '' || cleanString.toLowerCase().includes('invalid date')) {
        return 'Data não informada';
      }
      
      const date = new Date(cleanString);
      
      if (!isValid(date) || isNaN(date.getTime())) {        const timestamp = Date.parse(cleanString);
        if (!isNaN(timestamp)) {
          const timestampDate = new Date(timestamp);
          if (isValid(timestampDate)) {
            return format(timestampDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
          }
        }
        
        const brMatch = cleanString.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (brMatch) {
          const [, day, month, year] = brMatch;
          const brDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          if (isValid(brDate)) {
            return format(brDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
          }
        }        return 'Data não informada';
      }
      
      return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    }    return 'Data inválida';
  } catch (error) {
    console.error('[ERRO] Erro crítico ao formatar data:', error, 'String original:', dateString);
    return 'Data não informada';
  }
};

const extractDateTimeFromISO = (isoString: string) => {  
  if (!isoString || isoString.trim() === '' || isoString.includes('Invalid Date')) {    return { date: '', time: '08:00' };
  }
  
  try {
    const date = new Date(isoString);
    if (!isValid(date) || isNaN(date.getTime())) {      return { date: '', time: '08:00' };
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    const result = {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}`
    };    return result;
  } catch (error) {
    console.error('[ERRO] Erro ao extrair data/hora do ISO:', error);
    return { date: '', time: '08:00' };
  }
};

export default function ServicesPage() {
  const { services, machines, technicians, createService, updateService, deleteService } = useData();
  const [filter, setFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [machineSearch, setMachineSearch] = useState('');
  const [filteredMachines, setFilteredMachines] = useState(machines);
  const [dashboardSelectedServiceId, setDashboardSelectedServiceId] = useState<string | null>(null);

  useEffect(() => {
    const selectedServiceId = sessionStorage.getItem('dashboardSelectedServiceId');
    if (selectedServiceId) {
      setDashboardSelectedServiceId(selectedServiceId);
    }
  }, []);

  useEffect(() => {
    if (machineSearch.trim() === '') {
      setFilteredMachines(machines);
    } else {
      const searchLower = machineSearch.toLowerCase();
      const filtered = machines.filter(m => 
        m.codigo.toLowerCase().includes(searchLower) ||
        m.modelo.toLowerCase().includes(searchLower) ||
        m.marca.toLowerCase().includes(searchLower) ||
        m.filial.toLowerCase().includes(searchLower)
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
      (machine && machine.codigo.toLowerCase().includes(searchStr))
    );
  });

  const totalItems = filteredServices.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedServices = filteredServices.slice(startIndex, endIndex);
  const displayStart = totalItems === 0 ? 0 : startIndex + 1;
  const displayEnd = totalItems === 0 ? 0 : Math.min(endIndex, totalItems);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  useEffect(() => {
    if (totalPages === 0) {
      if (currentPage !== 1) {
        setCurrentPage(1);
      }
      return;
    }

    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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
    const dateOnly = data.dataAgendamento; // YYYY-MM-DD
    const timeOnly = data.horaAgendamento; // HH:MM
    
    const isoString = `${dateOnly}T${timeOnly}:00.000Z`;    
    const testDate = new Date(isoString);
    if (isNaN(testDate.getTime())) {
      console.error('Data invalida:', isoString);
    }

    const selectedTech = technicians.find(t => t.id === data.tecnicoId);

    const formattedData = {
      tipoServico: data.tipoServico as ServiceType,
      maquinaId: data.maquinaId,
      dataAgendamento: isoString, // Enviar string ISO
      horaAgendamento: data.horaAgendamento,
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
    
    const { date, time } = extractDateTimeFromISO(service.dataAgendamento);    
    form.reset({
      tipoServico: service.tipoServico || 'PREVENTIVA',
      maquinaId: service.maquinaId || '',
      dataAgendamento: date || format(new Date(), 'yyyy-MM-dd'),
      horaAgendamento: time || '08:00',
      tecnicoId: service.tecnicoId || '',
      descricaoServico: service.descricaoServico || '',
      descricaoProblema: service.descricaoProblema || '',
      prioridade: service.prioridade || 'MEDIA',
      status: service.status || 'AGENDADO',
      observacoes: service.observacoes || ''
    });
    
    const machine = machines.find(m => m.id === service.maquinaId);
    if (machine) {
      setMachineSearch(machine.codigo);
    }
    
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingService(null);
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
    setMachineSearch('');
    setIsDialogOpen(true);
  };

  useEffect(() => {
    if (!dashboardSelectedServiceId) {
      return;
    }

    const selectedService = services.find((service) => service.id === dashboardSelectedServiceId);
    if (!selectedService) {
      return;
    }

    sessionStorage.removeItem('dashboardSelectedServiceId');
    setDashboardSelectedServiceId(null);
    setFilter('');
    handleEdit(selectedService);
  }, [dashboardSelectedServiceId, services]);

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'URGENTE': return 'text-red-600 bg-red-100 border-red-200';
      case 'ALTA': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'MEDIA': return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'BAIXA': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
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
                  {/* Campo de seleção de maquina */}
                  <FormField
                    control={form.control}
                    name="maquinaId"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Máquina</FormLabel>
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
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          
                          <div className="border rounded-md max-h-48 overflow-y-auto">
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
                                    onClick={() => {
                                      field.onChange(m.id);
                                      setMachineSearch(m.codigo);
                                    }}
                                  >
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <div className="font-medium">{m.codigo}</div>
                                        <div className="text-sm text-muted-foreground">
                                          {m.modelo} • {m.marca} • {m.filial}
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
                          </div>
                          
                          {field.value && (
                            <div className="text-sm text-muted-foreground">
                              Máquina selecionada: <span className="font-medium">
                                {machines.find(m => m.id === field.value)?.codigo}
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
                        <FormLabel>Data Agendada</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field}
                            min={form.watch('status') === 'CONCLUIDO' ? undefined : format(new Date(), 'yyyy-MM-dd')}
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
                          <SelectContent className="max-h-60 overflow-y-auto">
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
                            <Textarea placeholder="O que esta acontecendo..." className="bg-red-50 dark:bg-red-900/10" {...field} />
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
          paginatedServices.map((service) => {
            const machine = machines.find(m => m.id === service.maquinaId);
            
            const dataFormatada = formatServiceDate(service.dataAgendamento);
            
            return (
              <div 
                key={service.id} 
                className={cn(
                  "flex flex-col p-5 rounded-xl border bg-card shadow-sm transition-all hover:shadow-md group relative overflow-hidden cursor-pointer",
                  service.status === 'CONCLUIDO' && "opacity-75 hover:opacity-100"
                )}
                onClick={() => handleEdit(service)}
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
                    <span className="font-medium">{dataFormatada}</span>
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
                    {service.status === 'CONCLUIDO' && <CheckCircle className="w-3 h-3 mr-1" />}
                    {service.status === 'EM_ANDAMENTO' && <Clock className="w-3 h-3 mr-1" />}
                    {service.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-md border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Mostrando {displayStart}-{displayEnd} de {totalItems} serviços
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Itens por página</span>
            <Select value={String(itemsPerPage)} onValueChange={(value) => setItemsPerPage(Number(value))}>
              <SelectTrigger className="w-[90px]">
                <SelectValue placeholder="10" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>

            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <Button
                key={page}
                type="button"
                variant={page === currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages || 1))}
              disabled={totalPages === 0 || currentPage === totalPages}
            >
              Próximo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}



