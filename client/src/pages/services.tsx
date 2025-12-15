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
import { format, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Função para formatar data/hora com segurança - VERSÃO CORRIGIDA
const safeDateTimeFormat = (dateValue: any): string => {
  if (!dateValue || dateValue === '' || dateValue === 'null' || dateValue === 'undefined') {
    return 'Data/hora não informada';
  }
  
  try {
    console.log('📅 [DEBUG] safeDateTimeFormat recebeu:', dateValue);
    console.log('📅 [DEBUG] Tipo:', typeof dateValue);
    
    // Se for string, verificar se está vazia
    if (typeof dateValue === 'string' && dateValue.trim() === '') {
      return 'Data/hora não informada';
    }
    
    let date: Date;
    
    // Se já for um objeto Date
    if (dateValue instanceof Date) {
      date = dateValue;
    } else {
      // Tentar parsear como ISO primeiro
      if (typeof dateValue === 'string') {
        // Remover espaços extras
        const cleanDateStr = dateValue.trim();
        
        // Se for uma data ISO com 'Z' no final (UTC)
        if (cleanDateStr.includes('T') && cleanDateStr.includes('Z')) {
          date = new Date(cleanDateStr);
        } else {
          // Tentar parsear como Date normal
          date = new Date(cleanDateStr);
        }
      } else {
        // Tentar converter qualquer outro valor
        date = new Date(dateValue);
      }
    }
    
    console.log('📅 [DEBUG] Date criado:', date);
    console.log('📅 [DEBUG] Timestamp:', date.getTime());
    console.log('📅 [DEBUG] É válido?', !isNaN(date.getTime()));
    
    // Verificar se é válido
    if (isNaN(date.getTime())) {
      console.log('❌ [DEBUG] Data inválida, retornando padrão');
      return 'Data/hora não informada';
    }
    
    // Formatar para pt-BR
    const resultado = format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    console.log('✅ [DEBUG] Resultado formatado:', resultado);
    
    return resultado;
    
  } catch (error: any) {
    console.error('❌ [DEBUG] Erro em safeDateTimeFormat:', error.message);
    console.error('❌ [DEBUG] Stack:', error.stack);
    return 'Data/hora não informada';
  }
};

// Função para extrair data de string ISO
const extractDateFromISO = (isoString: string): string => {
  if (!isoString || isoString === '' || isoString === 'null') {
    return format(new Date(), 'yyyy-MM-dd');
  }
  
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return format(new Date(), 'yyyy-MM-dd');
    }
    return format(date, 'yyyy-MM-dd');
  } catch (error) {
    console.error('❌ Erro em extractDateFromISO:', error);
    return format(new Date(), 'yyyy-MM-dd');
  }
};

// Função para extrair hora de string ISO
const extractTimeFromISO = (isoString: string): string => {
  if (!isoString || isoString === '' || isoString === 'null') {
    return '08:00';
  }
  
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return '08:00';
    }
    return format(date, 'HH:mm');
  } catch (error) {
    console.error('❌ Erro em extractTimeFromISO:', error);
    return '08:00';
  }
};

// Função para debug de dados
const debugServiceData = (service: Service, index: number) => {
  console.log(`\n🔍 [DEBUG] Serviço ${index + 1}:`);
  console.log('📋 ID:', service.id);
  console.log('📅 DataAgendamento bruta:', service.dataAgendamento);
  console.log('📅 Tipo:', typeof service.dataAgendamento);
  console.log('🎯 Resultado safeDateTimeFormat:', safeDateTimeFormat(service.dataAgendamento));
  console.log('👨‍🔧 Técnico:', service.tecnicoNome);
  console.log('📝 Descrição:', service.descricaoServico);
  console.log('---');
};

const serviceSchema = z.object({
  tipoServico: z.enum(['PREVENTIVA', 'CORRETIVA', 'INSTALACAO', 'LIMPEZA', 'VISTORIA']),
  maquinaId: z.string().min(1, "Máquina é obrigatória"),
  dataAgendamento: z.string().min(1, "Data é obrigatória"),
  horaAgendamento: z.string(),
  tecnicoId: z.string().min(1, "Técnico é obrigatório"),
  descricaoServico: z.string().min(1, "Descrição é obrigatória"),
  descricaoProblema: z.string().optional(),
  prioridade: z.enum(['URGENTE', 'ALTA', 'MEDIA', 'BAIXA']),
  status: z.enum(['AGENDADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO', 'PENDENTE']),
  observacoes: z.string().optional(),
});

export default function ServicesPage() {
  const { services, machines, technicians, createService, updateService, deleteService } = useData();
  const [filter, setFilter] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [machineSearch, setMachineSearch] = useState('');
  const [filteredMachines, setFilteredMachines] = useState(machines);

  // Debug dos serviços quando carregam
  useEffect(() => {
    if (services.length > 0) {
      console.log('\n📊 [DEBUG] Total de serviços:', services.length);
      services.forEach((service, index) => {
        debugServiceData(service, index);
      });
    }
  }, [services]);

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

  const onSubmit = async (data: z.infer<typeof serviceSchema>) => {
    console.log('📤 [FRONTEND] Submetendo dados do formulário:', data);
    
    // Criar a data no formato ISO CORRETAMENTE
    const dateTimeStr = `${data.dataAgendamento}T${data.horaAgendamento}:00`;
    const dateTime = new Date(dateTimeStr);
    
    // Verificar se a data é válida
    if (isNaN(dateTime.getTime())) {
      console.error('❌ Data inválida após combinação:', dateTimeStr);
      alert('Data inválida. Por favor, verifique a data e hora.');
      return;
    }
    
    const isoString = dateTime.toISOString();
    
    console.log('📅 Data selecionada:', data.dataAgendamento);
    console.log('⏰ Hora selecionada:', data.horaAgendamento);
    console.log('📊 Data criada (ISO):', isoString);
    console.log('📅 Data local:', dateTime.toLocaleString('pt-BR'));

    const selectedTech = technicians.find(t => t.id === data.tecnicoId);

    // Preparar dados no formato esperado pela API
    const formattedData = {
      tipoServico: data.tipoServico,
      maquinaId: data.maquinaId,
      dataAgendamento: isoString,
      horaAgendamento: data.horaAgendamento,
      tecnicoId: data.tecnicoId,
      tecnicoNome: selectedTech ? selectedTech.nome : 'Desconhecido',
      descricaoServico: data.descricaoServico,
      descricaoProblema: data.descricaoProblema || '',
      prioridade: data.prioridade,
      status: data.status,
      observacoes: data.observacoes || ''
    };

    console.log('📤 [FRONTEND] Enviando dados para API:', formattedData);

    try {
      if (editingService) {
        console.log('✏️ Editando serviço:', editingService.id);
        await updateService(editingService.id, formattedData);
      } else {
        console.log('🆕 Criando novo serviço');
        await createService(formattedData);
      }
      
      setIsDialogOpen(false);
      setEditingService(null);
      form.reset();
      setMachineSearch('');
    } catch (error) {
      console.error('❌ Erro ao salvar serviço:', error);
      alert('Erro ao salvar serviço. Verifique os dados e tente novamente.');
    }
  };

  const handleEdit = (service: Service) => {
    console.log('📝 Editando serviço:', service.id);
    console.log('📅 Data do serviço do banco:', service.dataAgendamento);
    
    setEditingService(service);
    
    // Extrair data e hora da string ISO
    const dataAgendamento = extractDateFromISO(service.dataAgendamento);
    const horaAgendamento = extractTimeFromISO(service.dataAgendamento);
    
    console.log('📅 Data extraída:', dataAgendamento);
    console.log('⏰ Hora extraída:', horaAgendamento);
    
    form.reset({
      tipoServico: service.tipoServico as ServiceType,
      maquinaId: service.maquinaId,
      dataAgendamento,
      horaAgendamento,
      tecnicoId: service.tecnicoId || '',
      descricaoServico: service.descricaoServico,
      descricaoProblema: service.descricaoProblema || '',
      prioridade: service.prioridade as Priority,
      status: service.status as ServiceStatus,
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

  const handleDelete = async (serviceId: string) => {
    if (confirm('Tem certeza que deseja excluir este serviço?')) {
      try {
        await deleteService(serviceId);
      } catch (error) {
        console.error('❌ Erro ao deletar serviço:', error);
        alert('Erro ao deletar serviço.');
      }
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
                  {/* Campo de seleção de máquina */}
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
                                        <div className="text-xs text-muted-foreground mt-1">
                                          {m.localizacaoDescricao}
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
                        <FormLabel>Tipo de Serviço *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PREVENTIVA">Manutenção Preventiva</SelectItem>
                            <SelectItem value="CORRETIVA">Manutenção Corretiva</SelectItem>
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
                        <FormLabel>Prioridade *</FormLabel>
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
                        <FormLabel>Técnico Responsável *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o técnico" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-60 overflow-y-auto">
                            {technicians.map(t => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.nome} - {t.especialidade} {t.telefone ? `(${t.telefone})` : ''}
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
                        <FormLabel>Descrição do Serviço *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Descreva o que será feito durante o serviço..." 
                            {...field} 
                            rows={3}
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
                              placeholder="Descreva o problema ou defeito encontrado..." 
                              className="bg-red-50 dark:bg-red-900/10" 
                              {...field} 
                              rows={2}
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
                        <FormLabel>Status *</FormLabel>
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
                        <FormLabel>Observações Adicionais</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Observações importantes sobre o serviço..." 
                            {...field} 
                            rows={2}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="text-xs text-muted-foreground mt-2">
                  * Campos obrigatórios
                </div>
                
                <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingService(null);
                      form.reset();
                      setMachineSearch('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="w-full sm:w-auto">
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

      {/* Services List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredServices.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground bg-card border rounded-lg border-dashed">
            <div className="flex flex-col items-center gap-3">
              <Calendar className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-lg font-medium">Nenhum serviço encontrado</p>
              <p className="text-sm">Tente ajustar os filtros ou crie um novo serviço.</p>
            </div>
          </div>
        ) : (
          filteredServices.map((service, index) => {
            // Log para debug
            console.log(`🎯 Renderizando serviço ${index + 1}: ${service.id}`);
            console.log(`📅 DataAgendamento: ${service.dataAgendamento}`);
            console.log(`🎯 safeDateTimeFormat result: ${safeDateTimeFormat(service.dataAgendamento)}`);
            
            const machine = machines.find(m => m.id === service.maquinaId);
            const technician = technicians.find(t => t.id === service.tecnicoId);
            
            return (
              <div 
                key={service.id} 
                className={cn(
                  "flex flex-col p-5 rounded-xl border bg-card shadow-sm transition-all hover:shadow-md group relative overflow-hidden",
                  service.status === 'CONCLUIDO' && "opacity-90 hover:opacity-100"
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
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 opacity-0 group-hover:opacity-100" 
                      onClick={() => handleEdit(service)}
                      title="Editar serviço"
                    >
                      <PenTool className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 pl-2 flex-1">
                  {machine && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="p-1 bg-secondary rounded min-w-16">
                        <span className="font-mono text-xs text-foreground font-bold">{machine.codigo}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{machine.modelo}</div>
                        <div className="text-xs text-muted-foreground">
                          {machine.localizacaoDescricao} • {machine.filial}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span>{safeDateTimeFormat(service.dataAgendamento)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4 flex-shrink-0" />
                    <span>{service.tecnicoNome}</span>
                    {technician?.especialidade && (
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {technician.especialidade}
                      </span>
                    )}
                  </div>
                  
                  {service.descricaoProblema && (
                    <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 p-2 rounded">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span className="text-xs">{service.descricaoProblema}</span>
                    </div>
                  )}
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
                    {service.status === 'CANCELADO' && <X className="w-3 h-3 mr-1" />}
                    {service.status.replace('_', ' ')}
                  </span>
                  
                  <div className="text-xs text-muted-foreground">
                    {service.createdAt && new Date(service.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}