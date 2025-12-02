import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Avatar,
  IconButton,
  Paper
} from '@mui/material';
import {
  AcUnit as AcUnitIcon,
  Build as BuildIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as AttachMoneyIcon,
  Refresh as RefreshIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { maquinaService } from '../services/maquinaService';
import { servicoService } from '../services/servicoService';
import { formatarData, formatarMoeda } from '../utils/formatters';

const Dashboard = () => {
  const [estatisticasMaquinas, setEstatisticasMaquinas] = useState(null);
  const [estatisticasServicos, setEstatisticasServicos] = useState(null);
  const [manutencaoAtrasada, setManutencaoAtrasada] = useState([]);
  const [proximosServicos, setProximosServicos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDashboard();
  }, []);

  const carregarDashboard = async () => {
    setLoading(true);
    try {
      const [maquinasStats, servicosStats, manutencaoAtrasadaData] = await Promise.all([
        maquinaService.obterEstatisticas(),
        servicoService.obterEstatisticas(),
        maquinaService.obterManutencaoAtrasada()
      ]);

      setEstatisticasMaquinas(maquinasStats.data);
      setEstatisticasServicos(servicosStats.data);
      setManutencaoAtrasada(manutencaoAtrasadaData.data);
      setProximosServicos(servicosStats.data?.proximosServicos || []);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color, subtitle }) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Avatar sx={{ bgcolor: `${color}.main`, mr: 2, width: 56, height: 56 }}>
            {icon}
          </Avatar>
          <Box>
            <Typography variant="h4" component="div">
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ width: '100%', p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Dashboard
        </Typography>
        <IconButton onClick={carregarDashboard} color="primary">
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Cards de Estatísticas */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Máquinas Ativas"
            value={estatisticasMaquinas?.ativas || 0}
            icon={<AcUnitIcon />}
            color="primary"
            subtitle={`de ${estatisticasMaquinas?.total || 0} total`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Serviços Concluídos"
            value={estatisticasServicos?.concluidos || 0}
            icon={<CheckCircleIcon />}
            color="success"
            subtitle={`de ${estatisticasServicos?.total || 0} total`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Manutenção Atrasada"
            value={estatisticasMaquinas?.manutencaoAtrasada || 0}
            icon={<WarningIcon />}
            color="warning"
            subtitle="máquinas"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Custo Total"
            value={formatarMoeda(estatisticasServicos?.custoTotal || 0)}
            icon={<AttachMoneyIcon />}
            color="info"
            subtitle="em serviços"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Manutenção Atrasada */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <WarningIcon color="warning" sx={{ mr: 1 }} />
                Manutenção Atrasada
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {manutencaoAtrasada.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                  Nenhuma máquina com manutenção atrasada
                </Typography>
              ) : (
                <List dense>
                  {manutencaoAtrasada.slice(0, 5).map((maquina) => (
                    <ListItem
                      key={maquina.id}
                      component={Link}
                      to={`/maquinas/${maquina.id}`}
                      sx={{
                        textDecoration: 'none',
                        color: 'inherit',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                    >
                      <ListItemIcon>
                        <AcUnitIcon color="warning" />
                      </ListItemIcon>
                      <ListItemText
                        primary={maquina.codigo}
                        secondary={`${maquina.modelo} - ${maquina.localizacaoDescricao}`}
                      />
                      <Chip
                        label={`Atrasada`}
                        color="error"
                        size="small"
                      />
                    </ListItem>
                  ))}
                </List>
              )}
              
              {manutencaoAtrasada.length > 5 && (
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    +{manutencaoAtrasada.length - 5} máquinas atrasadas
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Próximos Serviços */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <ScheduleIcon color="info" sx={{ mr: 1 }} />
                Próximos Serviços
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {proximosServicos.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                  Nenhum serviço agendado
                </Typography>
              ) : (
                <List dense>
                  {proximosServicos.slice(0, 5).map((servico) => (
                    <ListItem
                      key={servico.id}
                      component={Link}
                      to={`/servicos/${servico.id}`}
                      sx={{
                        textDecoration: 'none',
                        color: 'inherit',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                    >
                      <ListItemIcon>
                        <BuildIcon color="action" />
                      </ListItemIcon>
                      <ListItemText
                        primary={servico.maquina?.codigo || 'Máquina não encontrada'}
                        secondary={
                          <>
                            <Typography component="span" variant="body2" color="text.primary">
                              {formatarData(servico.dataAgendamento)}
                            </Typography>
                            {` — ${servico.tecnicoNome}`}
                          </>
                        }
                      />
                      <Chip
                        label={servico.tipoServico}
                        size="small"
                        variant="outlined"
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Distribuição por Tipo de Serviço */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                Serviços por Tipo
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {estatisticasServicos?.porTipo?.map((item) => (
                <Box key={item.tipo} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">{item.tipo}</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {item.total} ({formatarMoeda(item.custoTotal)})
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(item.total / (estatisticasServicos?.total || 1)) * 100}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Máquinas por Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <AcUnitIcon color="secondary" sx={{ mr: 1 }} />
                Status das Máquinas
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                    <Typography variant="h4">{estatisticasMaquinas?.ativas || 0}</Typography>
                    <Typography variant="body2">Ativas</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                    <Typography variant="h4">{estatisticasMaquinas?.emManutencao || 0}</Typography>
                    <Typography variant="body2">Em Manutenção</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light', color: 'error.contrastText' }}>
                    <Typography variant="h4">{estatisticasMaquinas?.comDefeito || 0}</Typography>
                    <Typography variant="body2">Com Defeito</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.300' }}>
                    <Typography variant="h4">{estatisticasMaquinas?.inativas || 0}</Typography>
                    <Typography variant="body2">Inativas</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;