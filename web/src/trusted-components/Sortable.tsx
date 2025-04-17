import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SortableComponentProps } from './SortableZone'

export function Sortable<T extends { id: string }, ComponentProps>(props: {
    item: T
    Component: React.FC<SortableComponentProps<T, ComponentProps>>
    patch: (newItem: T) => void
    trash: (id: string) => void
    componentProps: ComponentProps // Ensure ExtraProps is properly typed
}) {
    const { item, Component, patch, trash, componentProps } = props
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        display: 'flex',
        justifyContent: 'center',
    }

    if (!listeners) return null

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
        >
            <Component
                listeners={listeners}
                item={item}
                patch={patch}
                trash={trash}
                {...componentProps}
            />
        </div>
    )
}
