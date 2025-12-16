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
import { Plus, Search, Filter, Calendar, Clock, User, AlertTriangle, CheckCircle, PenTool, X } from 'lucide-react';
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

// Função auxiliar para formatar data com segurança - VERSÃO SIMPLIFICADA E ROBUSTA
const formatServiceDate = (dateString: string): string => {
  console.log('📅 formatServiceDate chamada com:', dateString);
  
  if (!dateString || dateString.trim() === '' || dateString === 'Invalid Date') {
    console.log('❌ String vazia ou inválida');
    return 'Data não informada';
  }
  
  try {
    // Tentar criar data diretamente
    let date: Date;
    
    // Se já for um objeto Date
    if (dateString instanceof Date) {
      date = dateString;
    } 
    // Se for string ISO
    else if (typeof dateString === 'string') {
      // Remover caracteres problemáticos
      const cleanString = dateString.trim().replace(/["']/g, '');
      
      // Tentar parsear como ISO
      date = new Date(cleanString);
      
      // Se não funcionar, tentar outras abordagens
      if (isNaN(date.getTime())) {
        console.log('⚠️  ISO falhou, tentando timestamp...');
        const timestamp = Date.parse(cleanString);
        if (!isNaN(timestamp)) {
          date = new Date(timestamp);
        } else {
          console.log('❌ Todas as tentativas falharam');
          return 'Data inválida';
        }
      }
    } else {
      console.log('❌ Tipo não suportado:', typeof dateString);
      return 'Data inválida';
    }
    
    if (isNaN(date.getTime())) {
      console.log('❌ Data NaN após processamento');
      return 'Data inválida';
    }
    
    console.log('✅ Data válida:', date.toISOString(), 'Local:', date.toLocaleString('pt-BR'));
    
    // Formatar para exibição usando date-fns
    try {
      return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (formatError) {
      console.log('⚠️  date-fns falhou, usando formatação manual');
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${day}/${month}/${year} às ${hours}:${minutes}`;
    }
  } catch (error) {
    console.error('❌ Erro crítico ao formatar data:', error, 'String original:', dateString);
    return 'Data não informada';
  }
};

// Função auxiliar para extrair data e hora do formato ISO
const extractDateTimeFromISO = (isoString: string) => {
  console.log('🔍 extractDateTimeFromISO chamada com:', isoString);
  
  if (!isoString || isoString.trim() === '') {
    console.log('❌ String vazia');
    return { date: '', time: '08:00' };
  }
  
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      console.log('❌ Data inválida ao extrair');
      return { date: '', time: '08:00' };
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    const result = {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}`
    };
    
    console.log('✅ Extraído:', result);
    return result;
  } catch (error) {
    console.error('❌ Erro ao extrair data/hora do ISO:', error);
    return { date: '', time: '08:00' };
  }
};

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
    console.log('📅 Data selecionada:', data.dataAgendamento);
    console.log('⏰ Hora selecionada:', data.horaAgendamento);
    
    // Criar data ISO corretamente
    const dateOnly = data.dataAgendamento; // YYYY-MM-DD
    const timeOnly = data.horaAgendamento; // HH:MM
    
    // Criar string ISO no formato correto
    const isoString = `${dateOnly}T${timeOnly}:00.000Z`;
    
    console.log('📊 Data criada (ISO):', isoString);
    
    // Verificar se a data é válida
    const testDate = new Date(isoString);
    if (isNaN(testDate.getTime())) {
      console.error('❌ Data inválida:', isoString);
      // Fallback: usar data atual
      const fallbackDate = new Date();
      const fallbackISO = fallbackDate.toISOString();
      console.log('🔄 Usando fallback:', fallbackISO);
    } else {
      console.log('✅ Data válida:', isoString);
      console.log('📅 Data local:', testDate.toLocaleString('pt-BR'));
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

    console.log('📤 Enviando dados para API:', formattedData);

    if (editingService) {
      console.log('✏️ Editando serviço:', editingService.id);
      updateService(editingService.id, formattedData);
    } else {
      console.log('🆕 Criando novo serviço');
      createService(formattedData);
    }
    setIsDialogOpen(false);
    setEditingService(null);
    form.reset();
    setMachineSearch('');
  };

  const handleEdit = (service: Service) => {
    console.log('📝 Editando serviço:', service.id);
    console.log('📅 Data do serviço do banco (raw):', service.dataAgendamento);
    console.log('📊 Tipo da data:', typeof service.dataAgendamento);
    
    setEditingService(service);
    
    // Extrair data e hora usando a função auxiliar
    const { date, time } = extractDateTimeFromISO(service.dataAgendamento);
    
    console.log('📅 Data extraída:', date);
    console.log('⏰ Hora extraída:', time);
    
    form.reset({
      tipoServico: service.tipoServico,
      maquinaId: service.maquinaId,
      dataAgendamento: date || format(new Date(), 'yyyy-MM-dd'),
      horaAgendamento: time || '08:00',
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
      setMachineSearch(machine.codigo);
    }
    
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    console.log('🆕 Adicionando novo serviço');
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

  // Debug: logar todos os serviços quando a lista é atualizada
  useEffect(() => {
    console.log('🔍 [SERVICES DEBUG] Total de serviços:', services.length);
    services.forEach((service, index) => {
      console.log(`🔍 [SERVICES DEBUG] Serviço ${index + 1}:`, {
        id: service.id,
        descricao: service.descricaoServico,
        dataAgendamentoRaw: service.dataAgendamento,
        dataFormatada: formatServiceDate(service.dataAgendamento),
        status: service.status,
        tipoServico: service.tipoServico,
        maquinaId: service.maquinaId,
        tecnicoNome: service.tecnicoNome,
        prioridade: service.prioridade,
        observacoes: service.observacoes
      });
    });
    
    // Verificar o serviço específico que está sendo editado
    const specificService = services.find(s => s.id === 'f95436de-6452-4703-9b3b-48d311e7b6b1');
    if (specificService) {
      console.log('🔍 DEBUG ESPECÍFICO - Serviço editado:', {
        id: specificService.id,
        descricao: specificService.descricaoServico,
        dataAgendamentoRaw: specificService.dataAgendamento,
        tipo: typeof specificService.dataAgendamento,
        temData: !!specificService.dataAgendamento,
        dataFormatada: formatServiceDate(specificService.dataAgendamento),
        todosCampos: specificService
      });
    }
  }, [services]);

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
                  {/* Campo de seleção de máquina */}
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
            
            // Usar a função formatServiceDate para mostrar a data REAL do serviço
            const dataFormatada = formatServiceDate(service.dataAgendamento);
            
            // Log detalhado para debug
            console.log('🔍 RENDER Serviço:', {
              id: service.id,
              dataAgendamentoRaw: service.dataAgendamento,
              dataFormatada: dataFormatada,
              descricao: service.descricaoServico,
              tipoServico: service.tipoServico,
              status: service.status,
              prioridade: service.prioridade
            });
            
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
    </div>
  );
}