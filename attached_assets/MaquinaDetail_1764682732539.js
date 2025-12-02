import React from 'react';
import { Box, Typography, Paper, Button, Grid, Chip, Card, CardContent } from '@mui/material';
import { Link } from 'react-router-dom';
import { ArrowBack } from '@mui/icons-material';

const MaquinaDetail = () => {
  return (
    <Box>
      <Button
        component={Link}
        to="/maquinas"
        startIcon={<ArrowBack />}
        sx={{ mb: 2 }}
      >
        Voltar para Lista
      </Button>
      
      <Typography variant="h4" gutterBottom>
        Detalhes da Máquina
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Informações Básicas</Typography>
              <Typography><strong>Código:</strong> AC-001</Typography>
              <Typography><strong>Modelo:</strong> Split 9000</Typography>
              <Typography><strong>Marca:</strong> LG</Typography>
              <Typography><strong>Tipo:</strong> Split</Typography>
              <Typography><strong>Capacidade:</strong> 9.000 BTU</Typography>
              <Typography><strong>Voltagem:</strong> 220V</Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Localização</Typography>
              <Typography><strong>Local:</strong> Sala de Reunião Principal</Typography>
              <Typography><strong>Andar:</strong> 3º</Typography>
              <Typography><strong>Status:</strong> 
                <Chip label="Ativo" color="success" size="small" sx={{ ml: 1 }} />
              </Typography>
              <Typography><strong>Data de Instalação:</strong> 15/10/2023</Typography>
              <Typography><strong>Última Manutenção:</strong> 20/11/2023</Typography>
              <Typography><strong>Próxima Manutenção:</strong> 20/05/2024</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Histórico de Serviços
        </Typography>
        <Typography>Histórico em desenvolvimento...</Typography>
      </Paper>
    </Box>
  );
};

export default MaquinaDetail;