import React from 'react';
import { Box, Typography, Paper, Button, Grid, Chip, Card, CardContent } from '@mui/material';
import { Link } from 'react-router-dom';
import { ArrowBack } from '@mui/icons-material';

const ServicoDetail = () => {
  return (
    <Box>
      <Button
        component={Link}
        to="/servicos"
        startIcon={<ArrowBack />}
        sx={{ mb: 2 }}
      >
        Voltar para Lista
      </Button>
      
      <Typography variant="h4" gutterBottom>
        Detalhes do Serviço
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Informações do Serviço</Typography>
              <Typography><strong>Tipo:</strong> Manutenção Preventiva</Typography>
              <Typography><strong>Status:</strong> 
                <Chip label="Concluído" color="success" size="small" sx={{ ml: 1 }} />
              </Typography>
              <Typography><strong>Prioridade:</strong> 
                <Chip label="Média" color="info" size="small" sx={{ ml: 1 }} />
              </Typography>
              <Typography><strong>Data Agendada:</strong> 15/11/2023 09:00</Typography>
              <Typography><strong>Data Conclusão:</strong> 15/11/2023 12:30</Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Técnico Responsável</Typography>
              <Typography><strong>Nome:</strong> João Silva</Typography>
              <Typography><strong>Matrícula:</strong> TEC-001</Typography>
              <Typography><strong>Telefone:</strong> (11) 99999-9999</Typography>
              <Typography><strong>Horas Trabalhadas:</strong> 3.5h</Typography>
              <Typography><strong>Custo Total:</strong> R$ 450,00</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Descrição do Serviço
        </Typography>
        <Typography>Limpeza completa do split, verificação de pressão do gás, limpeza de filtros e verificação elétrica.</Typography>
      </Paper>
    </Box>
  );
};

export default ServicoDetail;