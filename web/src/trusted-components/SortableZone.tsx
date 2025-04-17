import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Sortable } from './Sortable'
import { FC } from 'react'
import { exciseIndex } from '../tools/exciseIndex'
import { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities'

export interface SortableComponentProps<T, ComponentProps> {
    listeners: SyntheticListenerMap
    item: T
    patch: (newItem: T) => void
    trash: (id: string) => void
    componentProps?: ComponentProps
}

export function SortableZone<T extends { id: string }, ComponentProps>(props: {
    items: T[]
    setItems: (items: T[]) => void
    Component: FC<SortableComponentProps<T, ComponentProps>>
    componentProps: ComponentProps // Ensure ExtraProps is properly typed
}) {
    const { items, setItems, Component, componentProps: componentProps } = props

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    )

    if (!items || !items.length) return null

    function patch(newItem: T) {
        const newItems = [...items]
        const index = newItems.findIndex((item) => item.id == newItem.id)
        newItems[index] = { ...newItems[index], ...newItem }
        setItems(newItems)
    }

    function trash(id: string) {
        const index = items.findIndex((item) => item.id == id)
        const newItems = exciseIndex(items, index)
        setItems(newItems)
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={items}
                strategy={verticalListSortingStrategy}
            >
                {items.map((item) => (
                    <Sortable
                        key={item.id}
                        item={item}
                        Component={Component}
                        patch={patch}
                        trash={trash}
                        componentProps={componentProps}
                    />
                ))}
            </SortableContext>
        </DndContext>
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function handleDragEnd(event: { active: any; over: any }) {
        const { active, over } = event

        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)

        if (active.id !== over.id) {
            setItems(arrayMove(items, oldIndex, newIndex) as T[])
        }
    }
}
