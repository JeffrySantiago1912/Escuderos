import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { DndContext, useDraggable, useDroppable, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { CalendarDays, Download, Sparkles, ChevronRight, ChevronDown, Layout, FileText, CheckCircle2, Zap, Sun, Moon } from 'lucide-react'
import { Button } from './components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './components/ui/card'
import { Badge } from './components/ui/badge'
import { cn } from './lib/utils'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import './App.css'

type Period = 'morning' | 'night'

type ShiftTimeId = '07:00' | '09:30' | '11:00' | '18:00' | '18:30'

type ShiftTime = {
  id: ShiftTimeId
  label: string
  period: Period
  defaultAttire: string
}

const SHIFT_TIMES: ShiftTime[] = [
  { id: '07:00', label: '7:00 AM', period: 'morning', defaultAttire: 'Traje azul, camisa blanca, zapatos negros.' },
  { id: '09:30', label: '9:30 AM', period: 'morning', defaultAttire: 'Camisa blanca, chaqueta azul, pantalón negro, zapatos negros.' },
  { id: '11:00', label: '11:00 AM', period: 'morning', defaultAttire: 'Chaqueta azul, camisa blanca, pantalón gris, zapatos negros.' },
  { id: '18:00', label: '6:00 PM', period: 'night', defaultAttire: 'Traje azul, camisa blanca, correa negra, zapatos negros.' },
  { id: '18:30', label: '6:30 PM', period: 'night', defaultAttire: 'Camisa blanca, chaqueta azul, pantalón negro, zapatos negros.' },
]


type Squire = {
  id: string
  name: string
  color: string
}

type Shift = {
  id: string
  date: string // ISO YYYY-MM-DD
  timeId: ShiftTimeId
  attire: string
  squireId?: string
}

type View = 'landing' | 'planner'

type MonthYear = {
  year: number
  month: number // 0-11
}

const UNIFORM_OPTIONS: string[] = [
  'Traje azul, camisa blanca, zapatos negros.',
  'Camisa blanca, chaqueta azul, pantalón negro, zapatos negros.',
  'Chaqueta azul, camisa blanca, pantalón gris, zapatos negros.',
  'Traje azul, camisa blanca, correa negra, zapatos negros.',
  'Camisa blanca, pantalón azul, zapatos negros.',
]

const SQUIRES: Squire[] = [
  { id: 's1', name: 'Diac. Anthony Marte', color: 'bg-blue-500/80' },
  { id: 's2', name: 'Alexis Ramirez', color: 'bg-emerald-500/80' },
  { id: 's3', name: 'Antonio Alcantara', color: 'bg-violet-500/80' },
  { id: 's4', name: 'Cesar', color: 'bg-amber-500/80' },
  { id: 's5', name: 'Frank Arias', color: 'bg-rose-500/80' },
  { id: 's6', name: 'Diac. Franklie Madera', color: 'bg-cyan-500/80' },
  { id: 's7', name: 'Franyeli Solano', color: 'bg-indigo-500/80' },
  { id: 's8', name: 'Jose Vidal', color: 'bg-orange-500/80' },
  { id: 's9', name: 'Julio Galvan', color: 'bg-teal-500/80' },
  { id: 's10', name: 'Diac. Franklin Batista', color: 'bg-fuchsia-500/80' },
  { id: 's11', name: 'Diac. Luis Enrique', color: 'bg-lime-500/80' },
  { id: 's12', name: 'Jewry', color: 'bg-pink-500/80' },
  { id: 's13', name: 'Jeffry Santiago', color: 'bg-sky-500/80' },
]

const monthNames = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

const weekdayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function dateToISO(date: Date): string {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getShiftTime(timeId: ShiftTimeId) {
  return SHIFT_TIMES.find((t) => t.id === timeId)!
}

function getPeriod(timeId: ShiftTimeId): Period {
  return getShiftTime(timeId).period
}

function generateEmptyShifts(monthYear: MonthYear): Shift[] {
  const { year, month } = monthYear
  const shifts: Shift[] = []
  const date = new Date(year, month, 1)

  while (date.getMonth() === month) {
    const weekday = date.getDay()
    let timeIds: ShiftTimeId[] = []

    if (weekday === 0) {
      // Domingos: cuatro servicios
      timeIds = ['07:00', '09:30', '11:00', '18:00']
    } else if (weekday === 3) {
      // Miércoles: servicio de la noche
      timeIds = ['18:30']
    }

    if (timeIds.length > 0) {
      const iso = dateToISO(date)
      timeIds.forEach((id) => {
        const time = getShiftTime(id)
        shifts.push({
          id: `${iso}-${time.id}`,
          date: iso,
          timeId: time.id,
          attire: time.defaultAttire,
        })
      })
    }

    date.setDate(date.getDate() + 1)
  }

  return shifts
}

function getConflictsForAssignment(shifts: Shift[], shift: Shift, squireId: string) {
  const sameDay = shifts.filter((s) => s.date === shift.date && s.squireId === squireId && s.id !== shift.id)

  const conflicts: string[] = []

  if (sameDay.length >= 2) {
    conflicts.push('Máximo 2 turnos por día para el mismo escudero.')
  }

  const hasMorning = sameDay.some((s) => getPeriod(s.timeId) === 'morning') || getPeriod(shift.timeId) === 'morning'
  const hasNight = sameDay.some((s) => getPeriod(s.timeId) === 'night') || getPeriod(shift.timeId) === 'night'

  if (hasMorning && hasNight) {
    conflicts.push('No puede estar en turnos de mañana y noche el mismo día.')
  }

  return conflicts
}

type DraggableSquireProps = {
  squire: Squire
  isDark?: boolean
}

function DraggableSquire({ squire, isDark = true }: DraggableSquireProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `squire-${squire.id}`,
    data: { type: 'squire', squireId: squire.id },
  })

  const style = isDragging ? { opacity: 0.4 } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'group flex cursor-grab items-center justify-between rounded-full border px-3 py-2 text-sm transition active:cursor-grabbing',
        isDark
          ? 'border-slate-800 bg-slate-900/40 shadow-sm hover:border-blue-500 hover:bg-slate-900/60'
          : 'border-slate-200 bg-white shadow-sm hover:border-blue-500 hover:bg-blue-50/50',
        isDragging && (isDark ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-950' : 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white'),
      )}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0 py-0.5">
        <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', squire.color)} />
        <span className={cn("flex-1 text-left font-bold leading-normal", isDark ? "text-slate-200" : "text-slate-700")}>{squire.name}</span>
      </div>
      <span className={cn("ml-2 text-[10px] uppercase transition-colors shrink-0", isDark ? "text-slate-500 group-hover:text-slate-400" : "text-slate-400 group-hover:text-blue-500")}>Arrastrar</span>
    </div>
  )
}

type DroppableShiftCellProps = {
  shift: Shift
  squire?: Squire
  conflicts: string[]
  onClear: () => void
  onAssign: (squireId: string) => void
  isDark?: boolean
}

function DroppableShiftCell({ shift, squire, conflicts, onClear, onAssign, isDark = true }: DroppableShiftCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `shift-${shift.id}`,
    data: { type: 'shift', shiftId: shift.id },
  })
  const hasConflict = conflicts.length > 0

  return (
    <td
      ref={setNodeRef}
      className={cn(
        'align-top border-x px-3 py-2 text-sm transition-colors',
        isDark ? 'border-slate-800/70 bg-slate-950/40' : 'border-slate-100 bg-white',
        isOver && (isDark ? 'bg-slate-900/80' : 'bg-blue-50/50'),
      )}
    >
      <div className="flex flex-col gap-1.5">
        <div
          className={cn(
            'flex min-h-[2.25rem] items-center justify-between gap-2 rounded-lg border border-dashed px-2 py-1.5 transition-colors',
            isDark ? 'border-slate-600/80 bg-slate-950/70' : 'border-slate-300 bg-slate-50/50',
            squire && (isDark ? 'border-solid border-slate-500/80' : 'border-solid border-blue-400/50'),
            hasConflict && (isDark ? 'border-destructive bg-destructive/10' : 'border-red-500 bg-red-50'),
          )}
        >
          {squire ? (
            <>
              <div className="flex items-center gap-2 min-w-0 py-0.5">
                <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', squire.color)} />
                <span className={cn("text-[12px] font-bold leading-normal", isDark ? "text-slate-100" : "text-slate-900")}>{squire.name}</span>
              </div>
              <button
                aria-label="Quitar escudero del turno"
                className={cn(
                  "rounded-full p-1 text-[10px] transition-colors",
                  isDark ? "text-slate-500 hover:bg-slate-800 hover:text-slate-300" : "text-slate-400 hover:bg-slate-100 hover:text-red-500"
                )}
                onClick={onClear}
              >
                ✕
              </button>
            </>
          ) : (
            <div className="relative flex w-full items-center">
              <select
                className={cn(
                  "w-full appearance-none bg-transparent px-2 py-0.5 text-[11px] font-bold outline-none cursor-pointer",
                  isDark ? "text-slate-400 hover:text-blue-400" : "text-slate-500 hover:text-blue-600"
                )}
                onChange={(e) => {
                  if (e.target.value) onAssign(e.target.value)
                }}
                value=""
              >
                <option value="" disabled className={isDark ? "bg-slate-900" : "bg-white"}>Asignar...</option>
                {SQUIRES.map((s) => (
                  <option key={s.id} value={s.id} className={isDark ? "bg-slate-900 text-slate-200" : "bg-white text-slate-800"}>
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown className={cn(
                "pointer-events-none absolute right-1 h-3.5 w-3.5 transition-transform group-hover:scale-110",
                isDark ? "text-slate-500" : "text-slate-400"
              )} />
            </div>
          )}
        </div>

        {hasConflict && (
          <div className={cn(
            "rounded-md border px-2 py-1",
            isDark ? "border-destructive/60 bg-destructive/10" : "border-red-200 bg-red-50"
          )}>
            <p className={cn("text-[11px] font-bold", isDark ? "text-red-400" : "text-red-600")}>
              ¡Conflicto!
            </p>
          </div>
        )}
      </div>
    </td>
  )
}

function autoAssignShifts(shifts: Shift[], squires: Squire[]): Shift[] {
  if (squires.length === 0) return shifts

  const byDate: Record<string, Shift[]> = {}
  shifts.forEach((shift) => {
    if (!byDate[shift.date]) byDate[shift.date] = []
    byDate[shift.date].push(shift)
  })

  Object.values(byDate).forEach((list) => {
    list.sort(
      (a, b) =>
        SHIFT_TIMES.findIndex((t) => t.id === a.timeId) -
        SHIFT_TIMES.findIndex((t) => t.id === b.timeId),
    )
  })

  const result: Shift[] = shifts.map((s) => ({ ...s, squireId: undefined }))

  let cursor = 0

  for (const date of Object.keys(byDate).sort()) {
    const assignmentsPerDay: Record<string, { count: number; hasMorning: boolean; hasNight: boolean }> =
      {}

    const dayShifts = result.filter((s) => s.date === date)

    for (const shift of dayShifts) {
      for (let i = 0; i < squires.length; i += 1) {
        const candidate = squires[(cursor + i) % squires.length]
        const current = assignmentsPerDay[candidate.id] ?? {
          count: 0,
          hasMorning: false,
          hasNight: false,
        }

        const nextCount = current.count + 1
        const period = getPeriod(shift.timeId)
        const nextHasMorning = current.hasMorning || period === 'morning'
        const nextHasNight = current.hasNight || period === 'night'

        if (nextCount > 2) continue
        if (nextHasMorning && nextHasNight) continue

        assignmentsPerDay[candidate.id] = {
          count: nextCount,
          hasMorning: nextHasMorning,
          hasNight: nextHasNight,
        }

        const target = result.find((s) => s.id === shift.id)
        if (target) {
          target.squireId = candidate.id
        }
        cursor = (cursor + i + 1) % squires.length
        break
      }
    }
  }

  return result
}

function App() {
  const today = new Date()
  const [view, setView] = useState<View>('landing')
  const [monthYear, setMonthYear] = useState<MonthYear>({
    year: today.getFullYear(),
    month: today.getMonth(),
  })
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  const [shifts, setShifts] = useState<Shift[]>(() => generateEmptyShifts({
    year: today.getFullYear(),
    month: today.getMonth(),
  }))
  const [isExporting, setIsExporting] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  const scheduleRef = useRef<HTMLDivElement | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const shiftsByDate: Record<string, Shift[]> = useMemo(() => {
    const groups: Record<string, Shift[]> = {}
    shifts.forEach((shift) => {
      if (!groups[shift.date]) groups[shift.date] = []
      groups[shift.date].push(shift)
    })
    Object.values(groups).forEach((list) =>
      list.sort(
        (a, b) =>
          SHIFT_TIMES.findIndex((t) => t.id === a.timeId) -
          SHIFT_TIMES.findIndex((t) => t.id === b.timeId),
      ),
    )
    return groups
  }, [shifts])

  const stats = useMemo(() => {
    const total = shifts.length
    const assigned = shifts.filter((s) => s.squireId).length
    const pending = total - assigned
    const coverage = total > 0 ? (assigned / total) * 100 : 0

    const squireCounts: Record<string, number> = {}
    SQUIRES.forEach((s) => (squireCounts[s.id] = 0))
    shifts.forEach((s) => {
      if (s.squireId) squireCounts[s.squireId]++
    })

    const mostBusy = Object.entries(squireCounts).sort((a, b) => b[1] - a[1])[0]
    const mostBusySquire = SQUIRES.find((s) => s.id === mostBusy?.[0])

    return { total, assigned, pending, coverage, squireCounts, mostBusySquire, mostBusyCount: mostBusy?.[1] || 0 }
  }, [shifts])

  function handleChangeMonth(delta: number) {
    setMonthYear((prev) => {
      const nextMonth = prev.month + delta
      const date = new Date(prev.year, nextMonth, 1)
      const updated: MonthYear = { year: date.getFullYear(), month: date.getMonth() }
      setShifts(generateEmptyShifts(updated))
      return updated
    })
  }

  function handleMonthSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const month = Number(e.target.value)
    setMonthYear((prev) => {
      const updated: MonthYear = { year: prev.year, month }
      setShifts(generateEmptyShifts(updated))
      return updated
    })
  }

  function handleYearSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const year = Number(e.target.value)
    setMonthYear((prev) => {
      const updated: MonthYear = { year, month: prev.month }
      setShifts(generateEmptyShifts(updated))
      return updated
    })
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id.toString())
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const activeType = active.data.current?.type
    const overType = over.data.current?.type

    if (activeType !== 'squire' || overType !== 'shift') return

    const squireId: string | undefined = active.data.current?.squireId
    const shiftId: string | undefined = over.data.current?.shiftId
    if (!squireId || !shiftId) return

    setShifts((prev) => {
      const updated = prev.map((shift) =>
        shift.id === shiftId ? { ...shift, squireId } : shift,
      )
      return updated
    })
  }

  function handleAutoAssign() {
    setShifts((prev) => autoAssignShifts(prev, SQUIRES))
  }

  function handleClearAssignments() {
    setShifts((prev) => prev.map((s) => ({ ...s, squireId: undefined })))
  }

  async function handleExportImage() {
    if (!scheduleRef.current) return
    setIsExporting(true)
    // Wait a bit for the DOM to update
    await new Promise((resolve) => setTimeout(resolve, 100))

    try {
      const canvas = await html2canvas(scheduleRef.current, {
        backgroundColor: '#020617',
        scale: 2,
        logging: false,
        useCORS: true,
      })
      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `turnos-escuderos-${monthYear.month + 1}-${monthYear.year}.png`
      link.click()
    } finally {
      setIsExporting(false)
    }
  }

  function handleExportPdf() {
    const doc = new jsPDF('p', 'pt', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()

    // Add modern header
    doc.setFillColor(37, 99, 235) // Brand Blue
    doc.rect(0, 0, pageWidth, 80, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.setTextColor(255, 255, 255)
    doc.text('Programación de Escuderos', 40, 45)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    doc.setTextColor(200, 220, 255)
    doc.text(`${monthNames[monthYear.month]} ${monthYear.year}`, 40, 65)

    let y = 110

    const byDate: Record<string, Shift[]> = {}
    shifts.forEach((shift) => {
      if (!byDate[shift.date]) byDate[shift.date] = []
      byDate[shift.date].push(shift)
    })

    const sortedDates = Object.keys(byDate).sort()

    sortedDates.forEach((iso) => {
      const [yy, mm, dd] = iso.split('-').map(Number)
      const dateObj = new Date(yy, mm - 1, dd)
      const weekday = weekdayNames[dateObj.getDay()]

      const dayShifts = byDate[iso].slice().sort(
        (a, b) =>
          SHIFT_TIMES.findIndex((t) => t.id === a.timeId) -
          SHIFT_TIMES.findIndex((t) => t.id === b.timeId),
      )

      // Calculate needed height for this section
      const sectionHeight = 35 + (dayShifts.length * 25) + 20
      if (y + sectionHeight > 780) {
        doc.addPage()
        y = 50
      }

      // Day section header
      doc.setFillColor(248, 250, 252)
      doc.roundedRect(40, y, 515, 25, 4, 4, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(30, 41, 59)
      doc.text(`${weekday.toUpperCase()} ${dd}`, 50, y + 16)

      y += 35

      // Table Header Row
      const colX = [50, 130, 250]
      doc.setFontSize(9)
      doc.setTextColor(100, 116, 139)
        ;['HORARIO', 'ESCUDERO', 'VESTIMENTA'].forEach((h, idx) => {
          doc.text(h, colX[idx], y)
        })

      y += 8
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.5)
      doc.line(40, y, 555, y)
      y += 18

      // Table Body
      dayShifts.forEach((shift, index) => {
        const time = getShiftTime(shift.timeId)
        const squire = SQUIRES.find((s) => s.id === shift.squireId)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.setTextColor(51, 65, 85)

        // Time
        doc.text(time.label, colX[0], y)

        // Squire Name (Bold)
        if (squire) {
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(30, 41, 59)
          doc.text(squire.name, colX[1], y)
        } else {
          doc.setTextColor(148, 163, 184)
          doc.text('Pendiente', colX[1], y)
        }

        // Attire
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(71, 85, 105)
        const attireText = shift.attire
        const maxChars = 65
        const printedAttire = attireText.length > maxChars ? `${attireText.slice(0, maxChars - 3)}...` : attireText
        doc.text(printedAttire, colX[2], y)

        y += 22

        // Subtle row separator except for the last one
        if (index < dayShifts.length - 1) {
          doc.setDrawColor(241, 245, 249)
          doc.line(50, y - 8, 545, y - 8)
        }
      })

      y += 25 // Gap between days
    })

    const fileName = `turnos-escuderos-${monthYear.month + 1}-${monthYear.year}.pdf`
    doc.save(fileName)
  }

  function renderLanding() {
    const isDark = theme === 'dark'
    return (
      <div className={cn(
        "relative flex min-h-screen flex-col overflow-hidden font-sans transition-colors duration-300",
        isDark ? "bg-slate-950 text-slate-50" : "bg-white text-slate-900"
      )}>
        {/* Background Effects */}
        <div className="pointer-events-none absolute inset-0">
          <div className={cn(
            "absolute left-1/2 top-0 h-[600px] w-full -translate-x-1/2 rounded-full blur-[120px]",
            isDark ? "bg-blue-600/10" : "bg-blue-600/5"
          )} />
        </div>

        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl ring-1",
              isDark ? "bg-blue-600/20 ring-blue-500/40" : "bg-blue-600/10 ring-blue-500/20"
            )}>
              <CalendarDays className="h-6 w-6 text-blue-500" />
            </div>
            <p className={cn("text-lg font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Escuderos
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className={cn("rounded-full", isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")}
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button
              onClick={() => setView('planner')}
              className="bg-blue-600 text-white hover:bg-blue-500 rounded-full px-6"
            >
              Comenzar Ahora
            </Button>
          </div>
        </header>

        <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center space-y-8"
          >
            <Badge
              variant="outline"
              className={cn(
                "flex items-center gap-2 border-slate-800 bg-slate-900/50 px-4 py-1.5 text-xs font-medium text-blue-400 backdrop-blur-sm rounded-full",
                !isDark && "bg-blue-50 text-blue-600 border-blue-200"
              )}
            >
              <Sparkles className="h-3 w-3" />
              GESTIÓN DE TURNOS 2.0
            </Badge>

            <h1 className={cn(
              "max-w-4xl text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl",
              isDark ? "text-white" : "text-slate-900"
            )}>
              Organiza tus <br />
              <span className={cn(
                "bg-gradient-to-r bg-clip-text text-transparent",
                isDark ? "from-white to-slate-400" : "from-blue-600 to-indigo-600"
              )}>
                Escuderos con Sabiduría.
              </span>
            </h1>

            <p className={cn("max-w-2xl text-lg md:text-xl", isDark ? "text-slate-400" : "text-slate-600")}>
              La plataforma definitiva para gestionar turnos dominicales. <br className="hidden md:block" />
              <span className={isDark ? "text-slate-200" : "text-slate-900 font-semibold"}>Adiós Excel.</span> Hola precisión, elegancia y automatización.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Button
                size="lg"
                className="group h-14 rounded-full bg-blue-600 px-8 text-base font-semibold text-white shadow-lg hover:bg-blue-500 transition-all"
                onClick={() => setView('planner')}
              >
                Comenzar Ahora
                <ChevronRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-20 w-full max-w-4xl"
          >
            <div className={cn(
              "rounded-2xl border p-4 backdrop-blur-sm shadow-2xl",
              isDark ? "border-slate-800/60 bg-slate-900/20" : "border-slate-200/60 bg-white/50"
            )}>
              <div className={cn("flex items-center gap-1.5 border-b pb-3 mb-4", isDark ? "border-slate-800/60" : "border-slate-200")}>
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/40" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/40" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-500/40" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                {[
                  { icon: Zap, title: "Auto-Asignación", desc: "Genera turnos balanceados en segundos.", color: "blue" },
                  { icon: FileText, title: "Exportación PDF", desc: "Documentos listos para imprimir.", color: "indigo" },
                  { icon: CheckCircle2, title: "Cero Conflictos", desc: "Validación de reglas inteligente.", color: "emerald" },
                  { icon: Layout, title: "UI Premium", desc: "Interfaz moderna inspirada en herramientas top.", color: "sky" }
                ].map((item, i) => (
                  <div key={i} className={cn(
                    "flex flex-col items-center justify-center space-y-3 rounded-xl border p-6 text-center shadow-lg transition-all",
                    isDark
                      ? "border-slate-800/50 bg-slate-900/40 hover:border-blue-500/30 hover:bg-slate-900/60"
                      : "border-slate-100 bg-white hover:border-blue-200 hover:shadow-xl hover:-translate-y-1"
                  )}>
                    <div className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-2xl",
                      isDark ? `bg-${item.color}-600/20` : `bg-${item.color}-50`
                    )}>
                      <item.icon className={cn("h-6 w-6", `text-${item.color}-500`)} />
                    </div>
                    <div>
                      <h3 className={cn("text-xs font-bold uppercase tracking-wider", isDark ? "text-white" : "text-slate-900")}>{item.title}</h3>
                      <p className={cn("mt-1 text-[10px]", isDark ? "text-slate-400" : "text-slate-500")}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </main>

        <footer className={cn("relative z-10 py-12 text-center text-sm", isDark ? "text-slate-500" : "text-slate-400")}>
          © 2026 Escuderos. Elevando la organización eclesiástica.
        </footer>
      </div>
    )
  }

  function renderPlanner() {
    const isDark = theme === 'dark'
    return (
      <div className={cn(
        "min-h-screen transition-colors duration-300",
        isDark ? "bg-slate-950 text-slate-50" : "bg-slate-50 text-slate-900"
      )}>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-8 pt-4 md:px-6 md:pt-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-all",
                  isDark
                    ? "border-slate-800 bg-slate-900/80 text-slate-400 hover:border-slate-700 hover:text-white"
                    : "border-slate-200 bg-white text-slate-500 hover:border-blue-500 hover:text-blue-600 shadow-sm"
                )}
                onClick={() => setView('landing')}
              >
                ← Volver a Inicio
              </button>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl ring-1",
                  isDark ? "bg-sky-500/10 ring-sky-500/40" : "bg-sky-500/5 ring-sky-500/20 shadow-sm"
                )}>
                  <CalendarDays className="h-5 w-5 text-sky-500" />
                </div>
                <div>
                  <p className={cn("text-sm font-bold", isDark ? "text-slate-50" : "text-slate-900")}>
                    Planificador
                  </p>
                  <p className={cn("text-[10px] font-medium", isDark ? "text-slate-500" : "text-slate-400 uppercase tracking-tighter")}>
                    Gestión de Turnos v2.0
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                <span className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
                  isDark ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                )}>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  VÁLIDO
                </span>
                <span className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
                  isDark ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-rose-50 text-rose-600 border border-rose-100"
                )}>
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                  CONFLICTO
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className={cn("rounded-full", isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")}
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            </div>
          </header>

          <div className="grid gap-4 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.55fr)] lg:gap-6">
            <Card className={cn(
              "border-slate-800/80 overflow-hidden shadow-xl transition-colors",
              isDark ? "bg-slate-950/70" : "bg-white border-slate-200"
            )}>
              <div className={cn(
                "px-4 py-3 border-b flex items-center justify-between",
                isDark ? "bg-slate-900/40 border-slate-800/80" : "bg-slate-50 border-slate-200"
              )}>
                <h3 className={cn("text-xs font-bold flex items-center gap-2 uppercase tracking-widest", isDark ? "text-slate-400" : "text-slate-500")}>
                  <CalendarDays className="h-4 w-4 text-blue-500" />
                  Mes & Reglas
                </h3>
                <div className="flex gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-blue-500/40" />
                  <div className="h-2 w-2 rounded-full bg-indigo-500/40" />
                </div>
              </div>
              <CardContent className="p-5 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative group">
                    <select
                      value={monthYear.month}
                      onChange={handleMonthSelect}
                      className={cn(
                        "w-full h-11 px-4 pr-10 rounded-2xl border text-xs font-bold outline-none transition-all cursor-pointer appearance-none shadow-sm",
                        isDark
                          ? "border-slate-800 bg-slate-900/50 text-slate-100 focus:ring-2 focus:ring-blue-600/50 hover:border-slate-700"
                          : "border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-blue-500/20 hover:border-blue-200"
                      )}
                    >
                      {monthNames.map((m, idx) => (
                        <option key={m} value={idx}>
                          {m.toUpperCase()}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>

                  <div className="relative group">
                    <select
                      value={monthYear.year}
                      onChange={handleYearSelect}
                      className={cn(
                        "w-full h-11 px-4 pr-10 rounded-2xl border text-xs font-bold outline-none transition-all cursor-pointer appearance-none shadow-sm",
                        isDark
                          ? "border-slate-800 bg-slate-900/50 text-slate-100 focus:ring-2 focus:ring-blue-600/50 hover:border-slate-700"
                          : "border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-blue-500/20 hover:border-blue-200"
                      )}
                    >
                      {Array.from({ length: 5 }).map((_, idx) => {
                        const year = today.getFullYear() - 1 + idx
                        return (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        )
                      })}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    className="h-11 rounded-2xl bg-blue-600 text-[10px] font-bold text-white shadow-lg hover:bg-blue-500 transition-all active:scale-95 flex items-center justify-center gap-2"
                    onClick={handleAutoAssign}
                  >
                    <Sparkles className="h-4 w-4" />
                    AUTOGENERAR
                  </Button>
                  <Button
                    variant="ghost"
                    className={cn(
                      "h-11 rounded-2xl border bg-transparent text-[10px] font-bold transition-all active:scale-95",
                      isDark ? "border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200" : "border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    )}
                    onClick={handleClearAssignments}
                  >
                    LIMPIAR
                  </Button>
                </div>

                <div className="pt-4 border-t border-slate-800/50 space-y-3">
                  <p className={cn("text-[9px] font-bold uppercase tracking-wider", isDark ? "text-slate-500" : "text-slate-400")}>Reglas Activas</p>
                  <div className="flex flex-col gap-2">
                    <Badge className={cn(
                      "justify-between px-3 py-2 rounded-xl border font-bold text-[10px] shadow-sm",
                      isDark ? "bg-blue-600/10 border-blue-600/30 text-blue-400" : "bg-blue-50 border-blue-100 text-blue-600"
                    )}>
                      <span>LIMITAR A 2 TURNOS POR DÍA</span>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </Badge>
                    <Badge className={cn(
                      "justify-between px-3 py-2 rounded-xl border font-bold text-[10px] shadow-sm",
                      isDark ? "bg-indigo-600/10 border-indigo-600/30 text-indigo-400" : "bg-indigo-50 border-indigo-100 text-indigo-600"
                    )}>
                      <span>EVITAR MEZCLA MAÑANA/NOCHE</span>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={cn(
              "border-slate-800/80 transition-colors",
              isDark ? "bg-slate-950/80" : "bg-white border-slate-200"
            )}>
              <CardHeader className="border-b border-slate-800/20">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className={cn("text-sm font-bold uppercase tracking-tight", isDark ? "text-slate-50" : "text-slate-900")}>
                      Dashboard & Exportación
                    </CardTitle>
                    <CardDescription className={cn("text-xs", isDark ? "text-slate-400" : "text-slate-500")}>
                      Estadísticas del mes y herramientas de exportación.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn(
                        "rounded-full text-xs transition-all active:scale-95 px-4",
                        isDark
                          ? "border-slate-700 bg-slate-950/60 text-slate-200 hover:bg-slate-900 hover:border-slate-600"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-blue-500 hover:text-blue-600 shadow-sm"
                      )}
                      onClick={handleExportPdf}
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn(
                        "rounded-full text-xs transition-all active:scale-95 px-4",
                        isDark
                          ? "border-slate-700 bg-slate-950/60 text-slate-200 hover:bg-slate-900 hover:border-slate-600"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-blue-500 hover:text-blue-600 shadow-sm"
                      )}
                      onClick={handleExportImage}
                    >
                      <Layout className="mr-1.5 h-3.5 w-3.5" />
                      Imagen
                    </Button>

                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className={cn("p-5 border-r", isDark ? "border-slate-800/50" : "border-slate-100")}>
                    <p className={cn("text-[9px] font-bold uppercase tracking-wider mb-4", isDark ? "text-slate-500" : "text-slate-400")}>Cobertura Total</p>
                    <div className="flex items-center gap-6">
                      <div className="relative flex h-20 w-20 items-center justify-center">
                        <svg className="h-full w-full" viewBox="0 0 100 100">
                          <circle
                            className={cn("stroke-current", isDark ? "text-slate-800" : "text-slate-100")}
                            strokeWidth="10"
                            cx="50"
                            cy="50"
                            r="40"
                            fill="transparent"
                          ></circle>
                          <circle
                            className="stroke-blue-500 transition-all duration-700 ease-in-out"
                            strokeWidth="10"
                            strokeDasharray={`${stats.coverage * 2.51}, 251.2`}
                            strokeLinecap="round"
                            cx="50"
                            cy="50"
                            r="40"
                            fill="transparent"
                            transform="rotate(-90 50 50)"
                          ></circle>
                        </svg>
                        <span className={cn("absolute text-sm font-extrabold", isDark ? "text-white" : "text-slate-900")}>
                          {Math.round(stats.coverage)}%
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                          <p className={cn("text-[10px] font-bold", isDark ? "text-slate-300" : "text-slate-700")}>
                            {stats.assigned} Asignados
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={cn("h-2 w-2 rounded-full", isDark ? "bg-slate-700" : "bg-slate-200")} />
                          <p className={cn("text-[10px] font-bold", isDark ? "text-slate-500" : "text-slate-400")}>
                            {stats.pending} Pendientes
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 flex flex-col justify-center">
                    <p className={cn("text-[9px] font-bold uppercase tracking-wider mb-3", isDark ? "text-slate-500" : "text-slate-400")}>Líder de Escuderos</p>
                    <div className={cn("rounded-xl p-4 border relative overflow-hidden transition-all", isDark ? "bg-blue-600/10 border-blue-600/30" : "bg-blue-50 border-blue-200")}>
                      <div className="flex items-center gap-3 relative z-10">
                        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shadow-lg ring-2 ring-blue-500/20", "bg-blue-500 text-white")}>
                          D
                        </div>
                        <div>
                          <p className={cn("text-xs font-black tracking-tight", isDark ? "text-white" : "text-slate-700")}>Diácono Anthony Marte</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Sparkles className="h-3 w-3 text-blue-500" />
                            <p className={cn("text-[10px] font-bold uppercase tracking-wider", isDark ? "text-blue-400" : "text-blue-600")}>Coordinador General</p>
                          </div>
                        </div>
                        <div className="ml-auto text-right">
                          <p className={cn("text-[10px] font-bold", isDark ? "text-slate-400" : "text-slate-500")}>Turnos</p>
                          <p className={cn("text-lg font-black leading-none", isDark ? "text-blue-400" : "text-blue-600")}>
                            {stats.squireCounts['s1'] || 0}
                          </p>
                        </div>
                      </div>

                      {/* Decorative elements */}
                      <div className="absolute top-0 right-0 p-1 opacity-20 translate-x-2 -translate-y-2">
                        <Zap className="h-12 w-12 text-blue-500" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,0.75fr)_minmax(0,1.65fr)] lg:gap-6">
            <Card className={cn(
              "border-slate-800/80 transition-colors",
              isDark ? "bg-slate-950/80" : "bg-white border-slate-200"
            )}>
              <CardHeader>
                <CardTitle className={cn("text-sm font-bold", isDark ? "text-slate-50" : "text-slate-900")}>Escuderos</CardTitle>
                <CardDescription className={cn("text-xs font-semibold", isDark ? "text-slate-400" : "text-blue-600/70")}>
                  Arrastra los nombres para asignar.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  {SQUIRES.map((squire) => (
                    <DraggableSquire key={squire.id} squire={squire} isDark={isDark} />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card
              ref={scheduleRef}
              data-exporting={isExporting}
              className={cn(
                "border-slate-800/80 shadow-soft group/schedule transition-colors",
                isDark ? "bg-slate-950/90" : "bg-white border-slate-200"
              )}
            >
              <CardHeader className={cn(
                "border-b pb-3",
                isDark ? "border-slate-800/80" : "border-slate-100 bg-slate-50/50"
              )}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className={cn("text-sm font-bold", isDark ? "text-slate-50" : "text-slate-900")}>
                      Calendario del mes
                    </CardTitle>
                    <CardDescription className={cn("text-xs font-medium", isDark ? "text-slate-400" : "text-blue-600/70")}>
                      {Object.keys(shiftsByDate).length > 0
                        ? <>Servicios de {monthNames[monthYear.month]} {monthYear.year}</>
                        : 'Este mes no tiene servicios configurados.'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="icon"
                      variant="outline"
                      className={cn(
                        "h-8 w-8 rounded-full transition-all active:scale-90",
                        isDark
                          ? "border-slate-700 bg-slate-900/70 text-slate-200 hover:bg-slate-800"
                          : "border-slate-200 bg-white text-slate-600 hover:border-blue-500 hover:text-blue-600"
                      )}
                      onClick={() => handleChangeMonth(-1)}
                      aria-label="Mes anterior"
                    >
                      ‹
                    </Button>
                    <span className={cn("min-w-[120px] text-center text-[11px] font-bold uppercase tracking-tight", isDark ? "text-slate-200" : "text-slate-900")}>
                      {monthNames[monthYear.month]} {monthYear.year}
                    </span>
                    <Button
                      size="icon"
                      variant="outline"
                      className={cn(
                        "h-8 w-8 rounded-full transition-all active:scale-90",
                        isDark
                          ? "border-slate-700 bg-slate-900/70 text-slate-200 hover:bg-slate-800"
                          : "border-slate-200 bg-white text-slate-600 hover:border-blue-500 hover:text-blue-600"
                      )}
                      onClick={() => handleChangeMonth(1)}
                      aria-label="Mes siguiente"
                    >
                      ›
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="px-0 pb-4 pt-3">
                <div className="space-y-4 px-3 pb-2">
                  {Object.keys(shiftsByDate)
                    .sort()
                    .map((iso) => {
                      const [y, m, d] = iso.split('-').map(Number)
                      const dateObj = new Date(y, m - 1, d)
                      const weekday = weekdayNames[dateObj.getDay()]
                      const dayShifts = shiftsByDate[iso] ?? []

                      return (
                        <div
                          key={iso}
                          className={cn(
                            "overflow-hidden rounded-xl border transition-colors",
                            isDark ? "border-slate-800/80 bg-slate-950/80" : "border-slate-200 bg-white shadow-sm"
                          )}
                        >
                          <div className={cn(
                            "border-b px-4 py-2 text-center text-[11px] font-bold uppercase tracking-widest",
                            isDark ? "border-slate-800/80 bg-slate-950/90 text-slate-300" : "border-slate-100 bg-blue-600 text-white"
                          )}>
                            {weekday.toUpperCase()} {d}
                          </div>
                          <table className="w-full text-xs">
                            <thead className={isDark ? "bg-slate-950/80" : "bg-slate-50/80"}>
                              <tr>
                                <th className={cn(
                                  "border-b px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide",
                                  isDark ? "border-slate-800/80 text-slate-400" : "border-slate-200 text-slate-500"
                                )}>
                                  Horario
                                </th>
                                <th className={cn(
                                  "border-b border-l px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide",
                                  isDark ? "border-slate-800/80 text-slate-400" : "border-slate-200 text-slate-500"
                                )}>
                                  Escudero
                                </th>
                                <th className={cn(
                                  "border-b border-l px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide",
                                  isDark ? "border-slate-800/80 text-slate-400" : "border-slate-200 text-slate-500"
                                )}>
                                  Uniforme
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {dayShifts.map((shift) => {
                                const time = getShiftTime(shift.timeId)
                                const squire = SQUIRES.find((s) => s.id === shift.squireId)
                                const conflicts = shift.squireId
                                  ? getConflictsForAssignment(shifts, shift, shift.squireId)
                                  : []

                                return (
                                  <tr
                                    key={shift.id}
                                    className={cn(
                                      "border-t transition-colors",
                                      isDark ? "border-slate-900/80 bg-slate-950/80" : "border-slate-100 bg-white hover:bg-slate-50/50"
                                    )}
                                  >
                                    <td className={cn("px-3 py-2 text-[11px] font-medium", isDark ? "text-slate-200" : "text-slate-700")}>
                                      {time.label}
                                    </td>
                                    <DroppableShiftCell
                                      shift={shift}
                                      squire={squire}
                                      conflicts={conflicts}
                                      isDark={isDark}
                                      onAssign={(squireId) =>
                                        setShifts((prev) =>
                                          prev.map((s) =>
                                            s.id === shift.id ? { ...s, squireId } : s,
                                          ),
                                        )
                                      }
                                      onClear={() =>
                                        setShifts((prev) =>
                                          prev.map((s) =>
                                            s.id === shift.id ? { ...s, squireId: undefined } : s,
                                          ),
                                        )
                                      }
                                    />
                                    <td className={cn(
                                      "border-l px-3 py-2",
                                      isDark ? "border-slate-800/70" : "border-slate-200"
                                    )}>
                                      <div className="relative flex items-center group">
                                        <select
                                          value={shift.attire}
                                          onChange={(e) =>
                                            setShifts((prev) =>
                                              prev.map((s) =>
                                                s.id === shift.id
                                                  ? { ...s, attire: e.target.value }
                                                  : s,
                                              ),
                                            )
                                          }
                                          className={cn(
                                            "w-full appearance-none rounded-lg border px-3 py-1.5 text-[11px] outline-none transition-all shadow-sm",
                                            isDark
                                              ? "border-slate-700 bg-slate-900 text-slate-100 focus-visible:ring-2 focus-visible:ring-sky-500 group-hover:border-slate-600"
                                              : "border-slate-200 bg-slate-50 text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-500/20 hover:border-blue-300"
                                          )}
                                        >
                                          {UNIFORM_OPTIONS.map((option) => (
                                            <option key={option} value={option}>
                                              {option}
                                            </option>
                                          ))}
                                        </select>
                                        <div className="pointer-events-none absolute right-2 flex items-center text-slate-400">
                                          <ChevronDown className="h-3.5 w-3.5" />
                                        </div>
                                        {/* Overlay to ensure text is captured in image exports */}
                                        <div className={cn(
                                          "absolute inset-0 pointer-events-none items-center px-3 py-1.5 text-[11px] font-bold rounded-lg select-none hidden group-data-[exporting=true]/schedule:flex",
                                          isDark ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"
                                        )}>
                                          {shift.attire}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )
                    })}

                  {Object.keys(shiftsByDate).length === 0 && (
                    <p className="px-1 py-4 text-center text-xs text-slate-400">
                      No hay servicios configurados para este mes.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  const activeSquire = activeId ? SQUIRES.find((s) => s.id === activeId.replace('squire-', '')) : null

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {view === 'landing' ? renderLanding() : renderPlanner()}
      <DragOverlay dropAnimation={null}>
        {activeSquire ? (
          <div className={cn(
            "flex items-center gap-3 rounded-full border px-4 py-2.5 shadow-2xl transition-all cursor-grabbing scale-105 backdrop-blur-md",
            activeSquire.color,
            "border-white/30 text-white ring-4",
            theme === 'dark' ? "ring-blue-500/30" : "ring-blue-400/20"
          )}>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">
              {activeSquire.name.charAt(0)}
            </div>
            <span className="text-[11px] font-bold whitespace-nowrap">
              {activeSquire.name}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

export default App
