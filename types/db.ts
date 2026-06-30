import { z } from "zod";

const decimalSchema = z.union([
  z.number(),
  z.string().regex(/^-?\d+(\.\d+)?$/, "Decimal invalido"),
]);

const jsonSchema = z.unknown();

const dateSchema = z.coerce.date();
const nullableDateSchema = z.coerce.date().nullable();

export const PlatformRoleSchema = z.enum(["USER", "SUPERADMIN", "SUPPORT"]);
export type PlatformRole = z.infer<typeof PlatformRoleSchema>;

export const ComplejoRoleSchema = z.enum([
  "OWNER",
  "ADMIN",
  "DATAENTRY",
  "FISCAL",
  "STAFF",
]);
export type ComplejoRole = z.infer<typeof ComplejoRoleSchema>;

export const GeneroSchema = z.enum(["M", "F", "X"]);
export type Genero = z.infer<typeof GeneroSchema>;

export const EventTypeSchema = z.enum(["FINDE", "SEMANAL"]);
export type EventType = z.infer<typeof EventTypeSchema>;

export const TournamentStatusSchema = z.enum([
  "DRAFT",
  "PUBLISHED",
  "CLOSED_REGISTRATION",
  "IN_PROGRESS",
  "FINISHED",
  "ARCHIVED",
]);
export type TournamentStatus = z.infer<typeof TournamentStatusSchema>;

export const TournamentSexoSchema = z.enum(["MASCULINO", "FEMENINO", "MIXTO"]);
export type TournamentSexo = z.infer<typeof TournamentSexoSchema>;

export const TournamentCategoryRuleSchema = z.enum([
  "LIBRE",
  "MAYOR_IGUAL",
  "MENOR_IGUAL",
  "IGUAL",
  "SUMA",
]);
export type TournamentCategoryRule = z.infer<
  typeof TournamentCategoryRuleSchema
>;

export const MatchStatusSchema = z.enum([
  "PENDING",
  "SCHEDULED",
  "IN_PROGRESS",
  "FINISHED",
  "WALKOVER",
  "CANCELLED",
]);
export type MatchStatus = z.infer<typeof MatchStatusSchema>;

export const TurnoSlotStatusSchema = z.enum([
  "LIBRE",
  "RESERVADO",
  "BLOQUEADO",
]);
export type TurnoSlotStatus = z.infer<typeof TurnoSlotStatusSchema>;

export const BookingStatusSchema = z.enum([
  "CONFIRMADA",
  "CANCELADA",
  "NO_SHOW",
]);
export type BookingStatus = z.infer<typeof BookingStatusSchema>;

export const NotificationTypeSchema = z.enum([
  "MATCH_REMINDER",
  "MATCH_CHANGED",
  "TOURNAMENT_START",
  "SYSTEM",
]);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

export const NotificationStatusSchema = z.enum(["PENDING", "SENT", "FAILED"]);
export type NotificationStatus = z.infer<typeof NotificationStatusSchema>;

export const PushPlatformSchema = z.enum(["WEB", "ANDROID", "IOS"]);
export type PushPlatform = z.infer<typeof PushPlatformSchema>;

export const UserSchema = z.object({
  id: z.number().int(),
  email: z.string().email(),
  passwordHash: z.string(),
  name: z.string(),
  lastname: z.string(),
  telefono: z.string().nullable(),
  dni: z.string().nullable(),
  genero: GeneroSchema,
  categoria: z.string().nullable(),
  birthDate: nullableDateSchema,
  avatarUrl: z.string().nullable(),
  imageUrl: z.string().nullable(),
  platformRole: PlatformRoleSchema,
  isActive: z.boolean(),
  deletedAt: nullableDateSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type User = z.infer<typeof UserSchema>;

export const ComplejoSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  slug: z.string(),
  email: z.string().nullable(),
  telefono: z.string().nullable(),
  direccion: z.string().nullable(),
  ciudad: z.string(),
  provincia: z.string(),
  pais: z.string(),
  timezone: z.string(),
  isActive: z.boolean(),
  deletedAt: nullableDateSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type Complejo = z.infer<typeof ComplejoSchema>;

export const ComplejoMembershipSchema = z.object({
  id: z.number().int(),
  complejoId: z.number().int(),
  userId: z.number().int(),
  role: ComplejoRoleSchema,
  isActive: z.boolean(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type ComplejoMembership = z.infer<typeof ComplejoMembershipSchema>;

export const PerfilJugadorComplejoSchema = z.object({
  id: z.number().int(),
  complejoId: z.number().int(),
  userId: z.number().int(),
  categoria: z.string().nullable(),
  observado: z.boolean(),
  isBlocked: z.boolean(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type PerfilJugadorComplejo = z.infer<typeof PerfilJugadorComplejoSchema>;

export const CanchaSchema = z.object({
  id: z.number().int(),
  complejoId: z.number().int(),
  name: z.string().nullable(),
  numero: z.number().int(),
  superficie: z.string().nullable(),
  isIndoor: z.boolean(),
  dobles: z.boolean(),
  isActive: z.boolean(),
  deletedAt: nullableDateSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type Cancha = z.infer<typeof CanchaSchema>;

export const EventoSchema = z.object({
  id: z.number().int(),
  complejoId: z.number().int(),
  createdById: z.number().int().nullable(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  posterUrl: z.string().nullable(),
  tipo: EventTypeSchema,
  inicio: dateSchema,
  fin: dateSchema,
  isOpen: z.boolean(),
  isVisible: z.boolean(),
  isFinished: z.boolean(),
  deletedAt: nullableDateSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type Evento = z.infer<typeof EventoSchema>;

export const TorneoSchema = z.object({
  id: z.number().int(),
  eventoId: z.number().int(),
  nombre: z.string(),
  categoriaCode: z.string(),
  sexo: TournamentSexoSchema,
  categoriaRegla: TournamentCategoryRuleSchema,
  categoriaN: z.number().int().nullable(),
  comentario: z.string().nullable(),
  imagenUrl: z.string().nullable(),
  valorInsc: z.string().nullable(),
  jugxZona: z.number().int(),
  capacidad: z.number().int(),
  status: TournamentStatusSchema,
  publicado: z.boolean(),
  zonaCerrada: z.boolean(),
  zonaGenerada: z.boolean(),
  partidosGenerados: z.boolean(),
  actualizado: z.boolean(),
  inicio: nullableDateSchema,
  fin: nullableDateSchema,
  deletedAt: nullableDateSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type Torneo = z.infer<typeof TorneoSchema>;

export const ParejaSchema = z.object({
  id: z.number().int(),
  torneoId: z.number().int(),
  player1Id: z.number().int(),
  player2Id: z.number().int(),
  asignado: z.boolean(),
  suplente: z.boolean(),
  pago: z.boolean(),
  restriccion: z.string().nullable(),
  puntos: z.number().int(),
  partidoGanados: z.number().int(),
  partidoPerdidos: z.number().int(),
  setGanados: z.number().int(),
  setPerdidos: z.number().int(),
  gameGanados: z.number().int(),
  gamePerdidos: z.number().int(),
  posicionActual: z.number().int().nullable(),
  posicionFinal: z.number().int().nullable(),
  deletedAt: nullableDateSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type Pareja = z.infer<typeof ParejaSchema>;

export const GrupoSchema = z.object({
  id: z.number().int(),
  torneoId: z.number().int(),
  nombre: z.string(),
  comentario: z.string().nullable(),
  cerrado: z.boolean(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type Grupo = z.infer<typeof GrupoSchema>;

export const GrupoParejaSchema = z.object({
  id: z.number().int(),
  grupoId: z.number().int(),
  parejaId: z.number().int(),
  seed: z.number().int().nullable(),
  createdAt: dateSchema,
});
export type GrupoPareja = z.infer<typeof GrupoParejaSchema>;

export const PartidoSchema = z.object({
  id: z.number().int(),
  torneoId: z.number().int(),
  grupoId: z.number().int().nullable(),
  canchaId: z.number().int().nullable(),
  scheduledAt: nullableDateSchema,
  status: MatchStatusSchema,
  pareja1Id: z.number().int().nullable(),
  pareja2Id: z.number().int().nullable(),
  ganadorId: z.number().int().nullable(),
  perdedorId: z.number().int().nullable(),
  walkover: z.boolean(),
  fiscalizadoBy: z.number().int().nullable(),
  llave: z.string().nullable(),
  pareja1Letra: z.string().nullable(),
  pareja2Letra: z.string().nullable(),
  notas: z.string().nullable(),
  deletedAt: nullableDateSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type Partido = z.infer<typeof PartidoSchema>;

export const PartidoSetSchema = z.object({
  id: z.number().int(),
  partidoId: z.number().int(),
  numero: z.number().int(),
  gamesPareja1: z.number().int(),
  gamesPareja2: z.number().int(),
  tiebreakP1: z.number().int().nullable(),
  tiebreakP2: z.number().int().nullable(),
});
export type PartidoSet = z.infer<typeof PartidoSetSchema>;

export const RondaSchema = z.object({
  id: z.number().int(),
  torneoId: z.number().int(),
  nombre: z.string(),
  orden: z.number().int(),
  valor: decimalSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type Ronda = z.infer<typeof RondaSchema>;

export const RankingSchema = z.object({
  id: z.number().int(),
  jugadorId: z.number().int(),
  torneoId: z.number().int(),
  rondaId: z.number().int(),
  valor: decimalSchema,
  deletedAt: nullableDateSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type Ranking = z.infer<typeof RankingSchema>;

export const RecategorizacionSchema = z.object({
  id: z.number().int(),
  complejoId: z.number().int(),
  jugadorId: z.number().int(),
  createdById: z.number().int().nullable(),
  fecha: dateSchema,
  nivelPrevio: z.string(),
  nivelNuevo: z.string(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type Recategorizacion = z.infer<typeof RecategorizacionSchema>;

export const TurnoSlotSchema = z.object({
  id: z.number().int(),
  canchaId: z.number().int(),
  createdById: z.number().int().nullable(),
  startAt: dateSchema,
  endAt: dateSchema,
  duracionMin: z.number().int(),
  status: TurnoSlotStatusSchema,
  deletedAt: nullableDateSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type TurnoSlot = z.infer<typeof TurnoSlotSchema>;

export const TurnoReservaSchema = z.object({
  id: z.number().int(),
  turnoSlotId: z.number().int(),
  jugadorId: z.number().int(),
  createdById: z.number().int().nullable(),
  status: BookingStatusSchema,
  notas: z.string().nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
  cancelledAt: nullableDateSchema,
});
export type TurnoReserva = z.infer<typeof TurnoReservaSchema>;

export const SponsorSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  imageUrl: z.string(),
  link: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type Sponsor = z.infer<typeof SponsorSchema>;

export const ComplejoSponsorSchema = z.object({
  id: z.number().int(),
  complejoId: z.number().int(),
  sponsorId: z.number().int(),
  orden: z.number().int(),
  isActive: z.boolean(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type ComplejoSponsor = z.infer<typeof ComplejoSponsorSchema>;

export const GeneracionSchema = z.object({
  id: z.number().int(),
  complejoId: z.number().int(),
  eventoId: z.number().int().nullable(),
  torneoId: z.number().int().nullable(),
  tipo: z.string(),
  jsonData: z.string(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type Generacion = z.infer<typeof GeneracionSchema>;

export const EmailVerificationSchema = z.object({
  id: z.number().int(),
  userId: z.number().int(),
  token: z.string(),
  expiresAt: dateSchema,
  usedAt: nullableDateSchema,
  createdAt: dateSchema,
});
export type EmailVerification = z.infer<typeof EmailVerificationSchema>;

export const PushTokenSchema = z.object({
  id: z.string(),
  token: z.string(),
  userId: z.number().int().nullable(),
  platform: PushPlatformSchema.nullable(),
  createdAt: dateSchema,
  lastUsed: dateSchema,
});
export type PushToken = z.infer<typeof PushTokenSchema>;

export const NotificationSchema = z.object({
  id: z.string(),
  userId: z.number().int(),
  type: NotificationTypeSchema,
  title: z.string(),
  body: z.string(),
  scheduledAt: nullableDateSchema,
  sentAt: nullableDateSchema,
  status: NotificationStatusSchema,
  metadata: jsonSchema.nullable(),
  createdAt: dateSchema,
});
export type Notification = z.infer<typeof NotificationSchema>;

export const DbTableSchemas = {
  User: UserSchema,
  Complejo: ComplejoSchema,
  ComplejoMembership: ComplejoMembershipSchema,
  PerfilJugadorComplejo: PerfilJugadorComplejoSchema,
  Cancha: CanchaSchema,
  Evento: EventoSchema,
  Torneo: TorneoSchema,
  Pareja: ParejaSchema,
  Grupo: GrupoSchema,
  GrupoPareja: GrupoParejaSchema,
  Partido: PartidoSchema,
  PartidoSet: PartidoSetSchema,
  Ronda: RondaSchema,
  Ranking: RankingSchema,
  Recategorizacion: RecategorizacionSchema,
  TurnoSlot: TurnoSlotSchema,
  TurnoReserva: TurnoReservaSchema,
  Sponsor: SponsorSchema,
  ComplejoSponsor: ComplejoSponsorSchema,
  Generacion: GeneracionSchema,
  EmailVerification: EmailVerificationSchema,
  PushToken: PushTokenSchema,
  Notification: NotificationSchema,
} as const;
