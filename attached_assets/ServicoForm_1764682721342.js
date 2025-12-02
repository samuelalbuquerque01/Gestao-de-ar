import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  DatePicker,
  TimePicker
} from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  AttachMoney as AttachMoneyIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ServicoForm = ({ servico, maquinas, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    tipoServico: 'PREVENTIVA',
    maquinaId: '',
    dataAgendamento: new Date(),
    tecnicoNome: '',
    tecnicoMatricula: '',
    tecnicoTelefone: '',
    descricaoProblema: '',
    descricaoServico: '',
    prioridade: 'MEDIA',
    status: 'AGENDADO',
    horasTrabalhadas: 0,
    observacoes: ''
  });

  const [pecas, setPecas] = useState([]);
  const [materiais, setMateriais] = useState([]);
  const [novaPeca, setNovaPeca] = useState({ nome: '', codigo: '', quantidade: 1, valorUnitario: 0 });
  const [novoMaterial, setNovoMaterial] = useState({ nome: '', quantidade: 1, unidade: 'un' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (servico) {
      setFormData({
        ...servico.data,
        dataAgendamento: new Date(servico.data.dataAgendamento),
        horasTrabalhadas: servico.data.horasTrabalhadas || 0
      });
      setPecas(servico.data.pecas || []);
      setMateriais(servico.data.materiais || []);
    }
  }, [servico]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleDateChange = (date, field) => {
    setFormData(prev => ({ ...prev, [field]: date }));
  };

  const handleAddPeca = () => {
    if (!novaPeca.nome || novaPeca.quantidade <= 0) {
      alert('Por favor, preencha o nome e quantidade da peça');
      return;
    }
    
    setPecas(prev => [...prev, { ...novaPeca }]);
    setNovaPeca({ nome: '', codigo: '', quantidade: 1, valorUnitario: 0 });
  };

  const handleRemovePeca = (index) => {
    setPecas(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddMaterial = () => {
    if (!novoMaterial.nome || novoMaterial.quantidade <= 0) {
      alert('Por favor, preencha o nome e quantidade do material');
      return;
    }
    
    setMateriais(prev => [...prev, { ...novoMaterial }]);
    setNovoMaterial({ nome: '', quantidade: 1, unidade: 'un' });
  };

  const handleRemoveMaterial = (index) => {
    setMateriais(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.maquinaId) newErrors.maquinaId = 'Selecione uma máquina';
    if (!formData.tipoServico) newErrors.tipoServico = 'Selecione o tipo de serviço';
    if (!formData.tecnicoNome.trim()) newErrors.tecnicoNome = 'Nome do técnico é obrigatório';
    if (!formData.descricaoServico.trim()) {
      newErrors.descricaoServico = 'Descrição do serviço é obrigatória';
    }
    
    return newErrors;
  };

  const calcularCustoTotal = () => {
    const custoPecas = pecas.reduce((total, peca) => {
      return total + (peca.quantidade * (peca.valorUnitario || 0));
    }, 0);
    
    const custoMaoDeObra = (formData.horasTrabalhadas || 0) * 50; // R$50/hora
    return custoPecas + custoMaoDeObra;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setLoading(true);
    try {
      const dataToSubmit = {
        ...formData,
        pecas: pecas.length > 0 ? pecas : undefined,
        materiais: materiais.length > 0 ? materiais : undefined,
        custoTotal: calcularCustoTotal()
      };
      
      onSave(dataToSubmit);
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      setLoading(false);
    }
  };

  const tiposServico = [
    { value: 'PREVENTIVA', label: 'Manutenção Preventiva' },
    { value: 'CORRETIVA', label: 'Manutenção Corretiva' },
    { value: 'INSTALACAO', label: 'Instalação' },
    { value: 'LIMPEZA', label: 'Limpeza' },
    { value: 'VISTORIA', label: 'Vistoria' }
  ];

  const prioridades = [
    { value: 'BAIXA', label: 'Baixa' },
    { value: 'MEDIA', label: 'Média' },
    { value: 'ALTA', label: 'Alta' },
    { value: 'URGENTE', label: 'Urgente' }
  ];

  const statusOptions = [
    { value: 'AGENDADO', label: 'Agendado' },
    { value: 'EM_ANDAMENTO', label: 'Em Andamento' },
    { value: 'CONCLUIDO', label: 'Concluído' },
    { value: 'CANCELADO', label: 'Cancelado' },
    { value: 'PENDENTE', label: 'Pendente' }
  ];

  const unidades = [
    { value: 'un', label: 'Unidade' },
    { value: 'm', label: 'Metro' },
    { value: 'kg', label: 'Quilograma' },
    { value: 'L', label: 'Litro' },
    { value: 'pct', label: 'Pacote' }
  ];

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          {servico ? 'Editar Serviço' : 'Cadastrar Novo Serviço'}
        </Typography>
        
        {Object.keys(errors).length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Por favor, corrija os erros no formulário
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.tipoServico}>
                <InputLabel>Tipo de Serviço *</InputLabel>
                <Select
                  name="tipoServico"
                  value={formData.tipoServico}
                  onChange={handleChange}
                  label="Tipo de Serviço *"
                >
                  {tiposServico.map(tipo => (
                    <MenuItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.maquinaId}>
                <InputLabel>Máquina *</InputLabel>
                <Select
                  name="maquinaId"
                  value={formData.maquinaId}
                  onChange={handleChange}
                  label="Máquina *"
                >
                  {maquinas.map(maquina => (
                    <MenuItem key={maquina.id} value={maquina.id}>
                      {maquina.codigo} - {maquina.modelo} ({maquina.localizacaoDescricao})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                <DatePicker
                  label="Data de Agendamento *"
                  value={formData.dataAgendamento}
                  onChange={(date) => handleDateChange(date, 'dataAgendamento')}
                  renderInput={(params) => (
                    <TextField {...params} fullWidth required />
                  )}
                />
              </LocalizationProvider>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                <TimePicker
                  label="Horário"
                  value={formData.dataAgendamento}
                  onChange={(time) => {
                    const newDate = new Date(formData.dataAgendamento);
                    if (time) {
                      newDate.setHours(time.getHours(), time.getMinutes());
                      handleDateChange(newDate, 'dataAgendamento');
                    }
                  }}
                  renderInput={(params) => (
                    <TextField {...params} fullWidth />
                  )}
                />
              </LocalizationProvider>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Nome do Técnico *"
                name="tecnicoNome"
                value={formData.tecnicoNome}
                onChange={handleChange}
                error={!!errors.tecnicoNome}
                helperText={errors.tecnicoNome}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Matrícula"
                name="tecnicoMatricula"
                value={formData.tecnicoMatricula}
                onChange={handleChange}
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Telefone"
                name="tecnicoTelefone"
                value={formData.tecnicoTelefone}
                onChange={handleChange}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descrição do Problema"
                name="descricaoProblema"
                value={formData.descricaoProblema}
                onChange={handleChange}
                multiline
                rows={2}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descrição do Serviço *"
                name="descricaoServico"
                value={formData.descricaoServico}
                onChange={handleChange}
                error={!!errors.descricaoServico}
                helperText={errors.descricaoServico}
                required
                multiline
                rows={3}
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Prioridade</InputLabel>
                <Select
                  name="prioridade"
                  value={formData.prioridade}
                  onChange={handleChange}
                  label="Prioridade"
                >
                  {prioridades.map(prioridade => (
                    <MenuItem key={prioridade.value} value={prioridade.value}>
                      {prioridade.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  label="Status"
                >
                  {statusOptions.map(status => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Horas Trabalhadas"
                name="horasTrabalhadas"
                type="number"
                value={formData.horasTrabalhadas}
                onChange={handleChange}
                InputProps={{ inputProps: { min: 0, step: 0.5 } }}
              />
            </Grid>
            
            {/* Seção de Peças */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Peças Substituídas
              </Typography>
              
              <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="Nome da Peça"
                      value={novaPeca.nome}
                      onChange={(e) => setNovaPeca(prev => ({ ...prev, nome: e.target.value }))}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6} sm={2}>
                    <TextField
                      fullWidth
                      label="Código"
                      value={novaPeca.codigo}
                      onChange={(e) => setNovaPeca(prev => ({ ...prev, codigo: e.target.value }))}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6} sm={2}>
                    <TextField
                      fullWidth
                      label="Quantidade"
                      type="number"
                      value={novaPeca.quantidade}
                      onChange={(e) => setNovaPeca(prev => ({ ...prev, quantidade: parseInt(e.target.value) || 0 }))}
                      size="small"
                      InputProps={{ inputProps: { min: 1 } }}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      fullWidth
                      label="Valor Unitário"
                      type="number"
                      value={novaPeca.valorUnitario}
                      onChange={(e) => setNovaPeca(prev => ({ ...prev, valorUnitario: parseFloat(e.target.value) || 0 }))}
                      size="small"
                      InputProps={{ 
                        inputProps: { min: 0, step: 0.01 },
                        startAdornment: <AttachMoneyIcon fontSize="small" />
                      }}
                    />
                  </Grid>
                  <Grid item xs={6} sm={2}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleAddPeca}
                      startIcon={<AddIcon />}
                    >
                      Adicionar
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
              
              {pecas.length > 0 && (
                <TableContainer component={Paper} sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Peça</TableCell>
                        <TableCell>Código</TableCell>
                        <TableCell align="right">Quantidade</TableCell>
                        <TableCell align="right">Valor Unitário</TableCell>
                        <TableCell align="right">Total</TableCell>
                        <TableCell align="center">Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pecas.map((peca, index) => (
                        <TableRow key={index}>
                          <TableCell>{peca.nome}</TableCell>
                          <TableCell>{peca.codigo}</TableCell>
                          <TableCell align="right">{peca.quantidade}</TableCell>
                          <TableCell align="right">
                            R$ {peca.valorUnitario.toFixed(2)}
                          </TableCell>
                          <TableCell align="right">
                            R$ {(peca.quantidade * peca.valorUnitario).toFixed(2)}
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemovePeca(index)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              
              <Chip
                label={`Total em peças: R$ ${pecas.reduce((total, peca) => total + (peca.quantidade * peca.valorUnitario), 0).toFixed(2)}`}
                color="primary"
                variant="outlined"
                sx={{ mb: 2 }}
              />
            </Grid>
            
            {/* Seção de Materiais */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Materiais Utilizados
              </Typography>
              
              <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Nome do Material"
                      value={novoMaterial.nome}
                      onChange={(e) => setNovoMaterial(prev => ({ ...prev, nome: e.target.value }))}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      fullWidth
                      label="Quantidade"
                      type="number"
                      value={novoMaterial.quantidade}
                      onChange={(e) => setNovoMaterial(prev => ({ ...prev, quantidade: parseInt(e.target.value) || 0 }))}
                      size="small"
                      InputProps={{ inputProps: { min: 1 } }}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Unidade</InputLabel>
                      <Select
                        value={novoMaterial.unidade}
                        onChange={(e) => setNovoMaterial(prev => ({ ...prev, unidade: e.target.value }))}
                        label="Unidade"
                      >
                        {unidades.map(unidade => (
                          <MenuItem key={unidade.value} value={unidade.value}>
                            {unidade.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleAddMaterial}
                      startIcon={<AddIcon />}
                    >
                      Adicionar
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
              
              {materiais.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  {materiais.map((material, index) => (
                    <Chip
                      key={index}
                      label={`${material.nome} - ${material.quantidade} ${material.unidade}`}
                      onDelete={() => handleRemoveMaterial(index)}
                      sx={{ m: 0.5 }}
                    />
                  ))}
                </Box>
              )}
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observações"
                name="observacoes"
                value={formData.observacoes}
                onChange={handleChange}
                multiline
                rows={3}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="h6" gutterBottom>
                  Resumo Financeiro
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="body2">Peças:</Typography>
                  </Grid>
                  <Grid item xs={6} textAlign="right">
                    <Typography variant="body2">
                      R$ {pecas.reduce((total, peca) => total + (peca.quantidade * peca.valorUnitario), 0).toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">Mão de obra ({formData.horasTrabalhadas || 0}h):</Typography>
                  </Grid>
                  <Grid item xs={6} textAlign="right">
                    <Typography variant="body2">
                      R$ {((formData.horasTrabalhadas || 0) * 50).toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="h6">Total:</Typography>
                  </Grid>
                  <Grid item xs={6} textAlign="right">
                    <Typography variant="h6" color="primary">
                      R$ {calcularCustoTotal().toFixed(2)}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button 
              onClick={onCancel} 
              variant="outlined" 
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              disabled={loading}
            >
              {loading ? 'Salvando...' : servico ? 'Atualizar' : 'Agendar'}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ServicoForm;