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
  Typography
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MaquinaForm = ({ maquina, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    codigo: '',
    modelo: '',
    marca: '',
    tipo: 'SPLIT',
    capacidadeBTU: '',
    voltagem: 'V220',
    localizacaoTipo: 'SALA',
    localizacaoDescricao: '',
    localizacaoAndar: '',
    dataInstalacao: new Date(),
    status: 'ATIVO',
    observacoes: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (maquina) {
      setFormData({
        ...maquina.data,
        dataInstalacao: new Date(maquina.data.dataInstalacao),
        capacidadeBTU: maquina.data.capacidadeBTU.toString(),
        localizacaoAndar: maquina.data.localizacaoAndar?.toString() || ''
      });
    }
  }, [maquina]);

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

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.codigo.trim()) newErrors.codigo = 'Código é obrigatório';
    if (!formData.modelo.trim()) newErrors.modelo = 'Modelo é obrigatório';
    if (!formData.marca.trim()) newErrors.marca = 'Marca é obrigatória';
    if (!formData.capacidadeBTU || parseInt(formData.capacidadeBTU) <= 0) {
      newErrors.capacidadeBTU = 'Capacidade deve ser maior que 0';
    }
    if (!formData.localizacaoDescricao.trim()) {
      newErrors.localizacaoDescricao = 'Descrição da localização é obrigatória';
    }
    
    return newErrors;
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
        capacidadeBTU: parseInt(formData.capacidadeBTU),
        localizacaoAndar: formData.localizacaoAndar ? parseInt(formData.localizacaoAndar) : null
      };
      
      onSave(dataToSubmit);
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      setLoading(false);
    }
  };

  const tiposMaquina = [
    { value: 'SPLIT', label: 'Split' },
    { value: 'WINDOW', label: 'Window' },
    { value: 'PISO_TETO', label: 'Piso-Teto' },
    { value: 'CASSETE', label: 'Cassete' },
    { value: 'INVERTER', label: 'Inverter' },
    { value: 'PORTATIL', label: 'Portátil' }
  ];

  const localizacoes = [
    { value: 'SALA', label: 'Sala' },
    { value: 'QUARTO', label: 'Quarto' },
    { value: 'ESCRITORIO', label: 'Escritório' },
    { value: 'SALA_REUNIAO', label: 'Sala de Reunião' },
    { value: 'OUTRO', label: 'Outro' }
  ];

  const voltagens = [
    { value: 'V110', label: '110V' },
    { value: 'V220', label: '220V' },
    { value: 'BIVOLT', label: 'Bivolt' }
  ];

  const statusOptions = [
    { value: 'ATIVO', label: 'Ativo' },
    { value: 'INATIVO', label: 'Inativo' },
    { value: 'MANUTENCAO', label: 'Em Manutenção' },
    { value: 'DEFEITO', label: 'Com Defeito' }
  ];

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          {maquina ? 'Editar Máquina' : 'Cadastrar Nova Máquina'}
        </Typography>
        
        {Object.keys(errors).length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Por favor, corrija os erros no formulário
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Código da Máquina *"
                name="codigo"
                value={formData.codigo}
                onChange={handleChange}
                error={!!errors.codigo}
                helperText={errors.codigo}
                required
                disabled={!!maquina}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Modelo *"
                name="modelo"
                value={formData.modelo}
                onChange={handleChange}
                error={!!errors.modelo}
                helperText={errors.modelo}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Marca *"
                name="marca"
                value={formData.marca}
                onChange={handleChange}
                error={!!errors.marca}
                helperText={errors.marca}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo *</InputLabel>
                <Select
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleChange}
                  label="Tipo *"
                >
                  {tiposMaquina.map(tipo => (
                    <MenuItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Capacidade (BTU) *"
                name="capacidadeBTU"
                type="number"
                value={formData.capacidadeBTU}
                onChange={handleChange}
                error={!!errors.capacidadeBTU}
                helperText={errors.capacidadeBTU}
                required
                InputProps={{ inputProps: { min: 7000 } }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Voltagem *</InputLabel>
                <Select
                  name="voltagem"
                  value={formData.voltagem}
                  onChange={handleChange}
                  label="Voltagem *"
                >
                  {voltagens.map(voltagem => (
                    <MenuItem key={voltagem.value} value={voltagem.value}>
                      {voltagem.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Localização *</InputLabel>
                <Select
                  name="localizacaoTipo"
                  value={formData.localizacaoTipo}
                  onChange={handleChange}
                  label="Tipo de Localização *"
                >
                  {localizacoes.map(loc => (
                    <MenuItem key={loc.value} value={loc.value}>
                      {loc.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Descrição do Local *"
                name="localizacaoDescricao"
                value={formData.localizacaoDescricao}
                onChange={handleChange}
                error={!!errors.localizacaoDescricao}
                helperText={errors.localizacaoDescricao}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Andar"
                name="localizacaoAndar"
                type="number"
                value={formData.localizacaoAndar}
                onChange={handleChange}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                <DatePicker
                  label="Data de Instalação *"
                  value={formData.dataInstalacao}
                  onChange={(date) => handleDateChange(date, 'dataInstalacao')}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      fullWidth 
                      required 
                    />
                  )}
                />
              </LocalizationProvider>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status *</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  label="Status *"
                >
                  {statusOptions.map(status => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
              {loading ? 'Salvando...' : maquina ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default MaquinaForm;