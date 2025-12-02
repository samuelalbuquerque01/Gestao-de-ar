import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  Tooltip,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Build as BuildIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Pending as PendingIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { servicoService } from '../services/servicoService';
import {
  formatarData,
  formatarDataHora,
  traduzirTipoServico,
  traduzirStatusServico,
  traduzirPrioridade,
  formatarMoeda
} from '../utils/formatters';

const ServicoList = ({ onEdit, onView }) => {
  const [servicos, setServicos] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filtros, setFiltros] = useState({
    status: '',
    tipoServico: '',
    tecnico: '',
    dataInicio: '',
    dataFim: '',
    prioridade: ''
  });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    servicoId: null,
    servicoDescricao: ''
  });

  useEffect(() => {
    carregarServicos();
  }, [page, rowsPerPage, filtros]);

  const carregarServicos = async () => {
    setLoading(true);
    try {
      const response = await servicoService.obterServicos({
        ...filtros,
        page: page + 1,
        limit: rowsPerPage
      });
      setServicos(response.data);
      setTotal(response.total);
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (field, value) => {
    setFiltros(prev => ({ ...prev, [field]: value }));
    setPage(0);
  };

  const handleDeleteClick = (servicoId, servicoDescricao) => {
    setDeleteDialog({
      open: true,
      servicoId,
      servicoDescricao
    });
  };

  const handleDeleteConfirm = async () => {
    try {
      await servicoService.excluirServico(deleteDialog.servicoId);
      carregarServicos();
      setDeleteDialog({ open: false, servicoId: null, servicoDescricao: '' });
    } catch (error) {
      console.error('Erro ao excluir serviço:', error);
      alert(error.message || 'Erro ao excluir serviço');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'CONCLUIDO': return <CheckCircleIcon fontSize="small" />;
      case 'AGENDADO': return <ScheduleIcon fontSize="small" />;
      case 'EM_ANDAMENTO': return <PendingIcon fontSize="small" />;
      case 'CANCELADO': return <CancelIcon fontSize="small" />;
      default: return <PendingIcon fontSize="small" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'CONCLUIDO': return 'success';
      case 'AGENDADO': return 'info';
      case 'EM_ANDAMENTO': return 'warning';
      case 'CANCELADO': return 'error';
      case 'PENDENTE': return 'default';
      default: return 'default';
    }
  };

  const getPriorityColor = (prioridade) => {
    switch (prioridade) {
      case 'URGENTE': return 'error';
      case 'ALTA': return 'warning';
      case 'MEDIA': return 'info';
      case 'BAIXA': return 'success';
      default: return 'default';
    }
  };

  const statusOptions = [
    { value: '', label: 'Todos' },
    { value: 'AGENDADO', label: 'Agendado' },
    { value: 'EM_ANDAMENTO', label: 'Em Andamento' },
    { value: 'CONCLUIDO', label: 'Concluído' },
    { value: 'CANCELADO', label: 'Cancelado' },
    { value: 'PENDENTE', label: 'Pendente' }
  ];

  const tipoServicoOptions = [
    { value: '', label: 'Todos' },
    { value: 'PREVENTIVA', label: 'Preventiva' },
    { value: 'CORRETIVA', label: 'Corretiva' },
    { value: 'INSTALACAO', label: 'Instalação' },
    { value: 'LIMPEZA', label: 'Limpeza' },
    { value: 'VISTORIA', label: 'Vistoria' }
  ];

  const prioridadeOptions = [
    { value: '', label: 'Todas' },
    { value: 'BAIXA', label: 'Baixa' },
    { value: 'MEDIA', label: 'Média' },
    { value: 'ALTA', label: 'Alta' },
    { value: 'URGENTE', label: 'Urgente' }
  ];

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" component="div">
              <BuildIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Serviços Agendados
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              component={Link}
              to="/servicos/novo"
            >
              Novo Serviço
            </Button>
          </Box>

          {/* Filtros */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <FilterListIcon sx={{ mr: 1 }} /> Filtros
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filtros.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    label="Status"
                  >
                    {statusOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Tipo de Serviço</InputLabel>
                  <Select
                    value={filtros.tipoServico}
                    onChange={(e) => handleFilterChange('tipoServico', e.target.value)}
                    label="Tipo de Serviço"
                  >
                    {tipoServicoOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Prioridade</InputLabel>
                  <Select
                    value={filtros.prioridade}
                    onChange={(e) => handleFilterChange('prioridade', e.target.value)}
                    label="Prioridade"
                  >
                    {prioridadeOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Buscar por técnico"
                  value={filtros.tecnico}
                  onChange={(e) => handleFilterChange('tecnico', e.target.value)}
                  InputProps={{
                    endAdornment: <SearchIcon />
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Data Início"
                  type="date"
                  value={filtros.dataInicio}
                  onChange={(e) => handleFilterChange('dataInicio', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Data Fim"
                  type="date"
                  value={filtros.dataFim}
                  onChange={(e) => handleFilterChange('dataFim', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Tabela */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Máquina</TableCell>
                  <TableCell>Tipo de Serviço</TableCell>
                  <TableCell>Data/Hora</TableCell>
                  <TableCell>Técnico</TableCell>
                  <TableCell>Prioridade</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Custo</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : servicos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      Nenhum serviço encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  servicos.map((servico) => (
                    <TableRow key={servico.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, mr: 1 }}>
                            <BuildIcon fontSize="small" />
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {servico.maquina?.codigo}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {servico.maquina?.modelo}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {traduzirTipoServico(servico.tipoServico)}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatarData(servico.dataAgendamento)}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {formatarDataHora(servico.dataAgendamento).split(', ')[1]}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {servico.tecnicoNome}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {servico.tecnicoMatricula}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={traduzirPrioridade(servico.prioridade)}
                          color={getPriorityColor(servico.prioridade)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(servico.status)}
                          label={traduzirStatusServico(servico.status)}
                          color={getStatusColor(servico.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {formatarMoeda(servico.custoTotal)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                          <Tooltip title="Ver Detalhes">
                            <IconButton
                              size="small"
                              component={Link}
                              to={`/servicos/${servico.id}`}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Editar">
                            <IconButton
                              size="small"
                              color="primary"
                              component={Link}
                              to={`/servicos/editar/${servico.id}`}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteClick(servico.id, servico.descricaoServico)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={total}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Linhas por página:"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
              }
            />
          </TableContainer>
        </CardContent>
      </Card>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, servicoId: null, servicoDescricao: '' })}
      >
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja excluir o serviço <strong>{deleteDialog.servicoDescricao}</strong>?
            Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, servicoId: null, servicoDescricao: '' })}>
            Cancelar
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ServicoList;