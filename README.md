# The Club House – Plataforma de Gestión de Alimentación Escolar

Una plataforma web moderna y completa para gestionar comidas escolares, pagos, paquetes y cuentas familiares. Diseño limpio y profesional con menú lateral, dashboard intuitivo y soporte para múltiples roles (Administrador, Padres, Vendedores).

## 🚀 Features

### Rol Administrador
- **Gestión de Usuarios**: Crear, editar, eliminar usuarios (Padres, Vendedores, Admins)
- **Gestión de Estudiantes**: Registrar información completa (alergias, restricciones, datos médicos)
- **Menú de Comidas**: CRUD completo de comidas con precios por nivel escolar
- **Categorías**: Desayuno, Almuerzo, Merienda, Bebidas, Snacks, etc.
- **Paquetes Dinámicos**: Crear paquetes mensuales, semanales, anuales o personalizados
- **Pedidos**: Revisar, gestionar estado de pedidos
- **Pagos**: Revisar pagos pendientes, aprobar/rechazar con comentarios
- **Reportes**: Dashboard con estadísticas, gráficos, exportación a PDF/Excel
- **Consumos**: Registrar consumo de estudiantes

### Rol Padre / Madre
- **Portal Privado**: Acceso seguro a información de sus hijos
- **Ver Menú**: Explorar comidas disponibles con precios según nivel
- **Planificar Comidas**: Seleccionar comidas para días específicos
- **Compras**: Realizar pedidos individuales o comprar paquetes
- **Pagos por SINPE Móvil**: Subir comprobante, realizar pago
- **Historial**: Ver consumo de hijos, historial de pagos
- **Paquetes Activos**: Visualizar comidas consumidas/restantes
- **Alertas**: Notificaciones sobre alergias y restricciones

### Rol Vendedor
- **Pedidos del Día**: Ver órdenes para preparar
- **Registrar Consumo**: Marcar cuando un estudiante consume una comida
- **Validación de Paquetes**: Verificar si tiene paquete activo
- **Búsqueda de Estudiante**: Encontrar rápidamente por nombre
- **Menú Disponible**: Consultar qué está disponible
- **Ventas del Día**: Resumen de transacciones
- **Restricciones**: Ver alergias antes de entregar comida

## 🛠 Stack Tecnológico

- **Framework**: [Next.js 16](https://nextjs.org/) (React 19)
- **Lenguaje**: TypeScript
- **Base de Datos**: PostgreSQL (Neon + Prisma ORM)
- **Autenticación**: NextAuth v5 (JWT + Credentials)
- **Estilos**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: Lucide Icons
- **State Management**: Zustand (opcional)
- **Requests**: Axios + React Query
- **Formularios**: React Hook Form + Zod
- **Exportación**: jsPDF, XLSX
- **Gráficos**: Recharts

## 📦 Estructura de Carpetas

```
the-club-house/
├── src/
│   ├── app/                          # App Router (Next.js 13+)
│   │   ├── (admin)/admin/            # Panel Administrador
│   │   │   ├── dashboard/
│   │   │   ├── users/
│   │   │   ├── students/
│   │   │   ├── menu/
│   │   │   ├── categories/
│   │   │   ├── packages/
│   │   │   ├── orders/
│   │   │   ├── payments/
│   │   │   ├── reports/
│   │   │   └── settings/
│   │   ├── (parent)/parent/          # Portal de Padres
│   │   │   ├── dashboard/
│   │   │   ├── children/
│   │   │   ├── menu/
│   │   │   ├── plan/
│   │   │   ├── packages/
│   │   │   ├── history/
│   │   │   ├── payments/
│   │   │   ├── receipts/
│   │   │   └── statements/
│   │   ├── (vendor)/vendor/          # Panel Vendedor
│   │   │   ├── dashboard/
│   │   │   ├── orders/
│   │   │   ├── register/
│   │   │   ├── search/
│   │   │   ├── menu/
│   │   │   ├── sales/
│   │   │   └── history/
│   │   ├── (public)/                 # Páginas Públicas
│   │   │   ├── page.tsx              # Home
│   │   │   ├── menu/page.tsx         # Menú público
│   │   │   └── nutrition/            # Nutricionista & Tips
│   │   ├── (auth)/                   # Páginas de Autenticación
│   │   │   ├── login/page.tsx
│   │   │   └── layout.tsx
│   │   ├── api/                      # API Routes
│   │   │   ├── auth/[...nextauth]/
│   │   │   ├── me/
│   │   │   ├── users/
│   │   │   ├── students/
│   │   │   ├── menu/
│   │   │   ├── categories/
│   │   │   ├── packages/
│   │   │   ├── orders/
│   │   │   ├── payments/
│   │   │   └── consumptions/
│   │   ├── layout.tsx                # Root layout
│   │   └── globals.css               # Estilos globales
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── Sidebar.tsx           # Menú lateral
│   │   │   ├── Header.tsx            # Header del dashboard
│   │   │   ├── StatsCard.tsx         # Tarjeta de estadísticas
│   │   │   └── StatusBadge.tsx       # Badge de estado
│   │   ├── public/
│   │   │   ├── PublicNavbar.tsx      # Navbar público
│   │   │   └── PublicFooter.tsx      # Footer público
│   │   └── providers.tsx             # NextAuth + React Query
│   ├── lib/
│   │   ├── db.ts                     # Prisma client singleton
│   │   └── utils.ts                  # Utilidades (formato, constantes)
│   ├── auth.ts                       # Configuración NextAuth
│   └── proxy.ts                      # Protección de rutas (Next.js 16)
├── prisma/
│   ├── schema.prisma                 # Esquema de BD
│   ├── migrations/                   # Migraciones de base de datos
│   └── seed.ts                       # Seed de datos iniciales
├── public/                           # Archivos estáticos
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── .env                              # Variables de entorno
```

## 🎨 Diseño Visual

- **Colores Principales**: 
  - Cielo/Sky Blue (`#0ea5e9`) - Primario
  - Gris Oscuro (`#0f172a`) - Sidebar y texto oscuro
  - Blanco/Crema - Fondo y cards
  
- **Componentes**:
  - Tarjetas redondeadas (rounded-2xl)
  - Sombras sutiles (shadow-sm)
  - Bordes claros (border-slate-200)
  - Transiciones suaves

## 🚀 Quick Start

### Requisitos
- Node.js 18+
- npm o yarn

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/tuusuario/the-club-house.git
cd the-club-house

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Crear base de datos
npx prisma migrate dev --name init

# Poblar base de datos con datos iniciales
npm run seed

# Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

### Docker (producción local)

Este proyecto incluye Dockerfile multi-stage y docker-compose conectado a Neon PostgreSQL.

```bash
# Construir imagen
npm run docker:build

# Levantar contenedor
npm run docker:up

# Ver logs
npm run docker:logs

# Detener contenedor
npm run docker:down
```

Notas Docker:
- El contenedor expone la app por defecto en `http://localhost:4387`.
- Si quieres otro puerto, cambia `DOCKER_HOST_PORT` en `.env` antes de levantar Docker.
- Usa `DATABASE_URL` de Neon desde `.env` para build y runtime.
- Al iniciar, el contenedor ejecuta `prisma db push` para asegurar esquema actualizado.

Nota:
- En desarrollo sin Docker (`npm run dev`) se mantiene `http://localhost:3000`.

## 📝 Credenciales de Prueba

Después de ejecutar `npm run seed`:

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Admin | admin@theclubhouse.cr | Admin123! |
| Parent | maria@example.com | Parent123! |
| Vendor | vendor@theclubhouse.cr | Vendor123! |

Nota: los usuarios con rol **STUDENT** (hijos) no tienen acceso directo al login.
Se gestionan desde la cuenta del padre/madre y desde el panel administrativo.

## 🔐 Autenticación y Seguridad

- **NextAuth v5**: JWT + Credentials Provider
- **Roles**: ADMIN, PARENT, VENDOR, STUDENT
- **Acceso STUDENT**: no inicia sesión directamente; se administra vía PARENT
- **Middleware**: Protección de rutas por rol
- **Hash de Contraseñas**: bcryptjs (12 rounds)
- **API Protection**: Validación de rol en cada endpoint

## 👤 Modelo de Usuarios y Visibilidad

Regla principal: **todos son usuarios** en la tabla `User`, y el campo `role` define dónde se muestran en el panel administrativo.

- **ADMIN**: solo aparece en **Usuarios**.
- **VENDOR**: solo aparece en **Usuarios**.
- **PARENT**: aparece en **Usuarios** y en la sección **Padres**.
- **STUDENT**: aparece en **Usuarios** y en la sección **Estudiantes**.

Para estudiantes, además del usuario (`role = STUDENT`), existe un perfil académico en la tabla `Student`:

- Cada `Student` tiene un `userId` (relación 1:1 con `User`).
- Cada `Student` tiene un `parentId` (relación con un usuario `PARENT`).
- Desde **Admin > Padres > Detalle**, se pueden crear y editar hijos del padre.
- El formulario de creación/edición de hijo es el mismo usado en **Admin > Estudiantes**.

## 📊 Base de Datos

### Modelos Principales

- **User**: Usuarios del sistema (Admins, Padres, Vendedores)
- **Student**: Estudiantes (nombre, grado, alergias, restricciones)
- **FoodCategory**: Categorías de comidas
- **FoodItem**: Comidas individuales con descripciones e imágenes
- **FoodItemPrice**: Precios por nivel escolar
- **Package**: Paquetes de comidas (mensuales, semanales, etc.)
- **StudentPackage**: Relación estudiante-paquete con estado
- **Order**: Pedidos de padres
- **OrderItem**: Items dentro de un pedido
- **Payment**: Pagos con estado (PENDING, APPROVED, REJECTED)
- **Consumption**: Registro de consumo de comidas
- **ActivityLog**: Auditoría de acciones del admin
- **Notification**: Notificaciones internas

## 🔌 API Endpoints

### Usuarios
- `GET /api/users` - Listar usuarios (Admin)
- `POST /api/users` - Crear usuario (Admin)
- `PUT /api/users/[id]` - Actualizar usuario (Admin)
- `DELETE /api/users/[id]` - Eliminar usuario (Admin)

### Estudiantes
- `GET /api/students` - Listar (según rol)
- `POST /api/students` - Crear
- `PUT /api/students/[id]` - Actualizar
- `DELETE /api/students/[id]` - Eliminar

### Menú
- `GET /api/menu` - Listar comidas
- `POST /api/menu` - Crear comida
- `PUT /api/menu/[id]` - Actualizar comida
- `DELETE /api/menu/[id]` - Eliminar comida

### Categorías
- `GET /api/categories` - Listar categorías
- `POST /api/categories` - Crear categoría

### Paquetes
- `GET /api/packages` - Listar paquetes
- `POST /api/packages` - Crear paquete

### Órdenes
- `GET /api/orders` - Listar órdenes (según rol)
- `POST /api/orders` - Crear orden
- `PUT /api/orders/[id]` - Actualizar estado

### Pagos
- `GET /api/payments` - Listar pagos (según rol)
- `POST /api/payments` - Crear pago
- `PUT /api/payments/[id]` - Aprobar/rechazar pago (Admin)

### Autenticación
- `POST /api/auth/signin` - Iniciar sesión
- `POST /api/auth/signout` - Cerrar sesión
- `GET /api/me` - Información del usuario actual

## 🎯 Funcionalidades Pendientes por Completar

Las siguientes secciones están creadas pero requieren implementación completa:

- [ ] Página detallada de Estudiantes (CRUD completo con modal)
- [ ] Gestión de Menú (crear, editar, eliminar comidas)
- [ ] Gestión de Categorías
- [ ] Gestión de Paquetes
- [ ] Página de Órdenes (Admin)
- [ ] Página de Pagos Pendientes (Admin)
- [ ] Página de Reportes (Dashboard con gráficos)
- [ ] Portal de Padres completo
- [ ] Panel de Vendedores completo
- [ ] Subida de imágenes (comidas, comprobantes)
- [ ] Notificaciones en tiempo real (opcional)
- [ ] Sistema de alertas (alergias, restricciones)
- [ ] Exportación de reportes (PDF, Excel)
- [ ] Integración con SINPE Móvil (opcional)

## 📱 Responsive Design

La plataforma es completamente responsive:
- **Mobile**: Optimizado para teléfonos (320px+)
- **Tablet**: Vista adaptada (768px+)
- **Desktop**: Experiencia completa con sidebar (1024px+)

## 🔧 Variables de Entorno

```env
# Base de datos (Neon PostgreSQL)
DATABASE_URL="postgresql://<user>:<password>@<host>/<database>?sslmode=require&channel_binding=require"

# NextAuth
AUTH_SECRET="theclubhouse-super-secret-key-change-in-production-2025"
NEXTAUTH_URL="http://localhost:3000"
AUTH_TRUST_HOST="true"

# Upload
UPLOAD_DIR="./public/uploads"
```

Si vas a ingresar desde otro dispositivo en la misma red (usando IP local), usa:

- `NEXTAUTH_URL="http://<TU_IP_LOCAL>:3000"`
- `AUTH_TRUST_HOST="true"`

## 📦 Scripts Disponibles

```bash
npm run dev          # Iniciar servidor de desarrollo
npm run dev:lan      # Iniciar en red local (0.0.0.0)
npm run build        # Compilar para producción
npm start           # Iniciar servidor de producción
npm run lint        # Ejecutar ESLint
npm run seed        # Poblar BD con datos iniciales
npm run docker:build # Construir imagen Docker
npm run docker:up    # Levantar contenedor Docker
npm run docker:down  # Detener contenedor Docker
npm run docker:logs  # Ver logs del contenedor
```

Nota de autenticación en desarrollo:
- Usa `npm run dev` cuando navegues con `localhost`.
- Usa `npm run dev:lan` solo cuando realmente vayas a entrar desde otro dispositivo de la red local.
- Evita mezclar en la misma sesión `localhost` e IP LAN, porque Auth.js maneja cookies por host.

## 🐳 Deploy en Producción

### Cambios Necesarios

1. **Configurar AUTH_SECRET**:
   ```bash
   openssl rand -base64 32
   ```

2. **Variables de entorno**:
   - `NODE_ENV=production`
   - `AUTH_SECRET=<generated-secret>`
   - `NEXTAUTH_URL=<your-domain>`
  - `DATABASE_URL=<neon-postgresql-url>`

### Opciones de Deploy

- **Vercel**: `vercel deploy` (recomendado para Next.js)
- **Railway**: Conectar repositorio Git
- **Render**: Configurar build y servidor
- **AWS**: EC2 + RDS
- **DigitalOcean**: App Platform

## 📚 Documentación Adicional

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma ORM](https://www.prisma.io/docs/)
- [NextAuth.js](https://next-auth.js.org/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Query](https://tanstack.com/query/latest)

## 🤝 Contribuir

1. Fork el repositorio
2. Crear rama para la feature (`git checkout -b feature/amazing-feature`)
3. Commit cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abrir Pull Request

## 📄 Licencia

MIT - Ver archivo LICENSE para detalles

## 👥 Autor

Desarrollado para **The Club House** - Gestión de Alimentación Escolar

---

**Estado**: En desarrollo ✨

**Última actualización**: 2025-06-23

**Contacto**: info@theclubhouse.cr | +506 4000 0000

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.



## 
cd /home/theclubhousecr/htdocs/theclubhousecr.com/the-club-house

git pull
docker compose down --remove-orphans
docker compose build --no-cache --pull
docker compose up -d --force-recreate --remove-orphans
docker image prune -f
docker builder prune -f
