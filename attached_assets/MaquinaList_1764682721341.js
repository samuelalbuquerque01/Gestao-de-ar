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
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  AcUnit as AcUnitIcon,
  Build as BuildIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { maquinaService } from '../services/maquinaService';
import {
  formatarData,
  traduzirStatusMaquina,
  formatarTipoMaquina,
  formatarLocalizacao
} from '../utils/formatters';

const MaquinaList = ({ onEdit, onView }) => {
  const [maquinas, setMaquinas] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filtros, setFiltros] = useState({
    status: '',
    marca: '',
    localizacao: '',
    tipo: ''
  });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    maquinaId: null,
    maquinaCodigo: ''
  });

  useEffect(() => {
    carregarMaquinas();
  }, [page, rowsPerPage, filtros]);

  const carregarMaquinas = async () => {
    setLoading(true);
    try {
      const response = await maquinaService.obterMaquinas({
        ...filtros,
        page: page + 1,
        limit: rowsPerPage
      });
      setMaquinas(response.data);
      setTotal(response.total);
    } catch (error) {
      console.error('Erro ao carregar máquinas:', error);
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

  const handleDeleteClick = (maquinaId, maquinaCodigo) => {
    setDeleteDialog({
      open: true,
      maquinaId,
      maquinaCodigo
    });
  };

  const handleDeleteConfirm = async () => {
    try {
      await maquinaService.excluirMaquina(deleteDialog.maquinaId);
      carregarMaquinas();
      setDeleteDialog({ open: false, maquinaId: null, maquinaCodigo: '' });
    } catch (error) {
      console.error('Erro ao excluir máquina:', error);
      alert(error.message || 'Erro ao excluir máquina');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ATIVO': return 'success';
      case 'INATIVO': return 'default';
      case 'MANUTENCAO': return 'warning';
      case 'DEFEITO': return 'error';
      default: return 'default';
    }
  };

  const formatarCapacidade = (btu) => {
    return `${btu.toLocaleString('pt-BR')} BTU`;
  };

  const statusOptions = [
    { value: '', label: 'Todos' },
    { value: 'ATIVO', label: 'Ativo' },
    { value: 'INATIVO', label: 'Inativo' },
    { value: 'MANUTENCAO', label: 'Em Manutenção' },
    { value: 'DEFEITO', label: 'Com Defeito' }
  ];

  const localizacaoOptions = [
    { value: '', label: 'Todas' },
    { value: 'SALA', label: 'Sala' },
    { value: 'QUARTO', label: 'Quarto' },
    { value: 'ESCRITORIO', label: 'Escritório' },
    { value: 'SALA_REUNIAO', label: 'Sala de Reunião' },
    { value: 'OUTRO', label: 'Outro' }
  ];

  const tipoOptions = [
    { value: '', label: 'Todos' },
    { value: 'SPLIT', label: 'Split' },
    { value: 'WINDOW', label: 'Window' },
    { value: 'PISO_TETO', label: 'Piso-Teto' },
    { value: 'CASSETE', label: 'Cassete' },
    { value: 'INVERTER', label: 'Inverter' },
    { value: 'PORTATIL', label: 'Portátil' }
  ];

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" component="div">
              <AcUnitIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Máquinas Cadastradas
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              component={Link}
              to="/maquinas/novo"
            >
              Nova Máquina
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
                  <InputLabel>Localização</InputLabel>
                  <Select
                    value={filtros.localizacao}
                    onChange={(e) => handleFilterChange('localizacao', e.target.value)}
                    label="Localização"
                  >
                    {localizacaoOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Tipo</InputLabel>
                  <Select
                    value={filtros.tipo}
                    onChange={(e) => handleFilterChange('tipo', e.target.value)}
                    label="Tipo"
                  >
                    {tipoOptions.map(option => (
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
                  label="Buscar por marca"
                  value={filtros.marca}
                  onChange={(e) => handleFilterChange('marca', e.target.value)}
                  InputProps={{
                    endAdornment: <SearchIcon />
                  }}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Tabela */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Modelo/Marca</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Capacidade</TableCell>
                  <TableCell>Localização</TableCell>
                  <TableCell>Data Instalação</TableCell>
                  <TableCell>Status</TableCell>
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
                ) : maquinas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      Nenhuma máquina encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  maquinas.map((maquina) => (
                    <TableRow key={maquina.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {maquina.codigo}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{maquina.modelo}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {maquina.marca}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {formatarTipoMaquina(maquina.tipo)}
                      </TableCell>
                      <TableCell>
                        {formatarCapacidade(maquina.capacidadeBTU)}
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {formatarLocalizacao(maquina.localizacaoTipo)}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {maquina.localizacaoDescricao}
                            {maquina.localizacaoAndar && ` - ${maquina.localizacaoAndar}º andar`}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {formatarData(maquina.dataInstalacao)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={traduzirStatusMaquina(maquina.status)}
                          color={getStatusColor(maquina.status)}
                          size="small"
                        />
                        {maquina.manutencaoAtrasada && (
                          <Chip
                            label="Manutenção Atrasada"
                            color="error"
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                          <Tooltip title="Ver Detalhes">
                            <IconButton
                              size="small"
                              component={Link}
                              to={`/maquinas/${maquina.id}`}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Editar">
                            <IconButton
                              size="small"
                              color="primary"
                              component={Link}
                              to={`/maquinas/editar/${maquina.id}`}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Agendar Serviço">
                            <IconButton
                              size="small"
                              color="secondary"
                              component={Link}
                              to={`/servicos/novo?maquina=${maquina.id}`}
                            >
                              <BuildIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteClick(maquina.id, maquina.codigo)}
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
        onClose={() => setDeleteDialog({ open: false, maquinaId: null, maquinaCodigo: '' })}
      >
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja excluir a máquina <strong>{deleteDialog.maquinaCodigo}</strong>?
            Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, maquinaId: null, maquinaCodigo: '' })}>
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

export default MaquinaList;