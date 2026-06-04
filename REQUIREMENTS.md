# Requisitos Tecnológicos - App Clínica Dental

## ⚠️ Importante: Versionamiento Requerido

Este documento especifica las versiones exactas necesarias para que el proyecto funcione correctamente en todas las ramas. Los colaboradores deben instalar exactamente estas versiones para evitar incompatibilidades.

---

## 📋 Requisitos del Sistema

### Node.js
- **Versión requerida**: `18.17.0` o superior (recomendado: `20.x` o `22.x`)
- **Descargar desde**: https://nodejs.org/en/
- **Verificar versión**:
  ```bash
  node --version
  ```

### pnpm (Gestor de Paquetes)
- **Versión requerida**: `9.0.0` o superior
- **Instalación**:
  ```bash
  npm install -g pnpm
  ```
- **Verificar versión**:
  ```bash
  pnpm --version
  ```

### Git
- **Versión requerida**: `2.30` o superior
- **Descargar desde**: https://git-scm.com/
- **Verificar versión**:
  ```bash
  git --version
  ```

---

## 🔧 Dependencias Principales - VERSIONES EXACTAS

### Framework y Librerías Base
| Paquete | Versión | Descripción |
|---------|---------|-------------|
| `next` | `16.2.6` | Framework React/Next.js |
| `react` | `19.2.6` | Librería de UI |
| `react-dom` | `19.2.6` | Renderizador DOM de React |
| `typescript` | `^5` | Lenguaje TypeScript |

### Autenticación
| Paquete | Versión | Descripción |
|---------|---------|-------------|
| `next-auth` | `4.24.14` | Autenticación para Next.js |
| `@auth/prisma-adapter` | `^2.7.1` | Adaptador Prisma para Auth |
| `bcryptjs` | `^2.4.3` | Hash de contraseñas |

### Base de Datos
| Paquete | Versión | Descripción |
|---------|---------|-------------|
| `@prisma/client` | `^5.22.0` | ORM para base de datos |
| `prisma` | `^5.22.0` | CLI de Prisma (devDependency) |

### UI y Componentes
| Paquete | Versión | Descripción |
|---------|---------|-------------|
| `@radix-ui/react-*` | `^1.x` | Componentes base accesibles |
| `@mui/material` | `^5.14.0` | Material UI components |
| `@mui/icons-material` | `^5.14.0` | Iconos de Material UI |
| `@mui/x-date-pickers` | `^7.18.0` | Selectores de fecha |
| `tailwindcss` | `^3.4.1` | Framework CSS utility-first |
| `@nextui-org/*` | `^2.x` | NextUI components |

### Calendarios y Programación
| Paquete | Versión | Descripción |
|---------|---------|-------------|
| `@aldabil/react-scheduler` | `^2.9.5` | Componente de agendamiento |
| `@syncfusion/ej2-react-schedule` | `^27.1.48` | Calendarios avanzados |
| `@syncfusion/ej2-react-grids` | `^27.1.48` | Tablas y grillas |
| `date-fns` | `^4.1.0` | Utilidades de fechas |
| `dayjs` | `^1.11.13` | Librería de fechas |

### Imágenes y Multimedia
| Paquete | Versión | Descripción |
|---------|---------|-------------|
| `cloudinary` | `^2.5.1` | SDK de Cloudinary |
| `next-cloudinary` | `^6.15.0` | Componentes Next.js para Cloudinary |
| `react-dropzone` | `^14.2.9` | Zona de arrastre para archivos |

### Gráficos y Visualización
| Paquete | Versión | Descripción |
|---------|---------|-------------|
| `chart.js` | `^4.4.4` | Librería de gráficos |
| `react-chartjs-2` | `^5.2.0` | Wrapper React para Chart.js |
| `recharts` | `^2.13.3` | Gráficos composables |

### Formularios y Validación
| Paquete | Versión | Descripción |
|---------|---------|-------------|
| `react-hook-form` | `^7.53.1` | Gestión de formularios |
| `@hookform/resolvers` | `^3.9.0` | Resolvers para validación |
| `zod` | `^3.23.8` | Validación de esquemas TypeScript |

### Email y Notificaciones
| Paquete | Versión | Descripción |
|---------|---------|-------------|
| `resend` | `^4.0.1-alpha.0` | Servicio de email |

### Animaciones y Estilos
| Paquete | Versión | Descripción |
|---------|---------|-------------|
| `framer-motion` | `^11.5.5` | Animaciones React |
| `@emotion/react` | `^11.13.3` | CSS-in-JS library |
| `@emotion/styled` | `^11.13.0` | Styled components con Emotion |
| `tailwind-merge` | `^2.5.2` | Merge de clases Tailwind |
| `tailwindcss-animate` | `^1.0.7` | Animaciones con Tailwind |

### Iconos y Utilidades
| Paquete | Versión | Descripción |
|---------|---------|-------------|
| `lucide-react` | `^0.441.0` | Librería de iconos |
| `react-icons` | `^5.3.0` | Iconos populares |
| `@radix-ui/react-icons` | `^1.3.0` | Iconos de Radix UI |

### Utilidades Generales
| Paquete | Versión | Descripción |
|---------|---------|-------------|
| `nanoid` | `^5.0.7` | Generador de IDs únicos |
| `clsx` | `^2.1.1` | Utilidad para clases CSS |
| `class-variance-authority` | `^0.7.0` | CVA para componentes |

### Herramientas de Desarrollo (devDependencies)
| Paquete | Versión | Descripción |
|---------|---------|-------------|
| `@types/node` | `^20` | Tipos de Node.js |
| `@types/react` | `^18` | Tipos de React |
| `@types/react-dom` | `^18` | Tipos de React DOM |
| `@types/bcryptjs` | `^2.4.6` | Tipos de bcryptjs |
| `eslint` | `^8` | Linter de código |
| `eslint-config-next` | `16.2.6` | Config ESLint para Next.js |
| `postcss` | `^8` | Procesador CSS |

---

## 🚀 Instrucciones de Instalación

### 1. Clonar el repositorio
```bash
git clone <URL_DEL_REPOSITORIO>
cd app-clinica-dental
```

### 2. Verificar versiones requeridas
```bash
node --version     # Debe ser >= 18.17.0
pnpm --version     # Debe ser >= 9.0.0
git --version
```

### 3. Instalar dependencias
```bash
pnpm install
```

### 4. Generar cliente de Prisma
```bash
pnpm prisma generate
```

### 5. Configurar variables de entorno
Crear archivo `.env.local` en la raíz del proyecto:
```bash
cp .env.example .env.local
```

Variables de ejemplo requeridas:
```env
# Autenticación
NEXTAUTH_SECRET=<tu_secret_generado>
NEXTAUTH_URL=http://localhost:3000

# Base de datos
DATABASE_URL=<tu_url_de_base_de_datos>

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<tu_cloud_name>
CLOUDINARY_API_KEY=<tu_api_key>
CLOUDINARY_API_SECRET=<tu_api_secret>

# Email (Resend)
RESEND_API_KEY=<tu_api_key>
```

### 6. Ejecutar migraciones de base de datos (si aplica)
```bash
pnpm prisma migrate deploy
```

### 7. Iniciar el servidor de desarrollo
```bash
pnpm dev
```

La aplicación estará disponible en: `http://localhost:3000`

---

## 🔄 Flujo de Trabajo para Colaboradores

### Al clonar una rama nueva
```bash
# 1. Actualizar código
git pull origin <nombre-rama>

# 2. Verificar versiones de Node y pnpm
node --version
pnpm --version

# 3. Instalar o actualizar dependencias
pnpm install

# 4. Generar schema de Prisma
pnpm prisma generate

# 5. Iniciar desarrollo
pnpm dev
```

### Cambiar entre ramas
```bash
# 1. Guardar cambios locales
git stash

# 2. Cambiar rama
git checkout <nombre-rama>

# 3. Instalar dependencias si cambió package.json
pnpm install

# 4. Generar Prisma (si cambió schema)
pnpm prisma generate

# 5. Continuar desarrollo
pnpm dev
```

---

## ⚙️ Configuración de IDE Recomendada

### VS Code - Extensiones Recomendadas
- **Prettier** (esbenp.prettier-vscode)
- **ESLint** (dbaeumer.vscode-eslint)
- **Tailwind CSS IntelliSense** (bradlc.vscode-tailwindcss)
- **TypeScript Vue Plugin (Volar)** (Vue.volar)
- **Prisma** (prisma.prisma)
- **PostCSS Language Support** (csstools.postcss)

### Configuración VS Code (.vscode/settings.json)
```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

---

## 🐛 Troubleshooting

### Error: "pnpm: command not found"
```bash
npm install -g pnpm
```

### Error: "Module not found" después de cambiar rama
```bash
pnpm install
pnpm prisma generate
```

### Error de conexión a base de datos
- Verificar variable `DATABASE_URL` en `.env.local`
- Asegurarse que la base de datos está corriendo
- Ejecutar: `pnpm prisma migrate deploy`

### Error de puerto 3000 en uso
```bash
# Usar puerto diferente
pnpm dev -- -p 3001
```

### Limpiar cache de Node
```bash
pnpm install --force
rm -rf .next
pnpm dev
```

---

## 📝 Notas Importantes

- ⚠️ **Nunca cambiar las versiones sin coordinación** con el equipo
- ⚠️ Después de cambiar `package.json`, ejecutar: `pnpm install`
- ⚠️ Después de cambiar `prisma/schema.prisma`, ejecutar: `pnpm prisma generate`
- ⚠️ No subir archivos `.env.local` a Git (está en .gitignore)
- ✅ Siempre hacer `pnpm install` después de hacer pull
- ✅ Usar `pnpm` en lugar de `npm` para instalar paquetes (por consistencia)

---

## 📞 Soporte

Si tienes problemas con las dependencias:
1. Verifica que tienes las versiones correctas
2. Ejecuta: `pnpm install --force`
3. Limpia cache: `rm -rf node_modules pnpm-lock.yaml`
4. Vuelve a instalar: `pnpm install`
5. Contacta al líder del equipo

---

**Última actualización**: Junio 2026  
**Versión del documento**: 1.0
