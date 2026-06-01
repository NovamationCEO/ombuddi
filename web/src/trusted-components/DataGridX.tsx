import { DataGrid, DataGridProps, GridColDef, GridRenderCellParams, GridValidRowModel } from '@mui/x-data-grid'
import { useStyles } from '../tools/useStyles'
import { OverflowTip } from './OverflowTip'
import React from 'react'
import { Box, lighten } from '@mui/material'

type DataGridXProps = {
    columns: GridColDef[]
    rows: GridValidRowModel[] | (() => GridValidRowModel[])
    showFooter?: boolean
    title?: string | React.ReactNode
    credit?: React.ReactNode
    sourceIt?: boolean
    pageSize?: number
} & DataGridProps

export function DataGridX(props: DataGridXProps) {
    const { columns, rows, showFooter = false, title, pageSize = 100, ...dataGridProps } = props
    const style = useStyles()

    const newCols = columns.map((col) => {
        return {
            renderCell: (params: GridRenderCellParams) => (
                <OverflowTip>
                    <Box
                        sx={{
                            whiteSpace: 'normal !important',
                        }}
                    >
                        {params.value}
                    </Box>
                </OverflowTip>
            ),
            renderHeader(params: GridRenderCellParams) {
                return (
                    <Box sx={{ whiteSpace: 'normal', textAlign: col.type === 'number' ? 'right' : 'inherit' }}>
                        {params.colDef.headerName}
                    </Box>
                )
            },
            disableColumnMenu: true,
            ...col,
        }
    })

    return (
        <Box>
            <Box
                sx={{
                    fontWeight: 'bold',
                    color: style.title.color
                }}>
                {title}
            </Box>
            <DataGrid
                columns={newCols}
                rows={rows}
                hideFooter={!showFooter && !props.pageSize}
                getRowHeight={() => 'auto'}
                autoHeight={true}
                columnHeaderHeight={90}
                initialState={{
                    pagination: {
                        paginationModel: { pageSize: pageSize, page: 0 },
                    },
                }}
                sx={{
                    '& .MuiDataGrid-columnHeader': {
                        bgcolor: style.header.bgcolor,
                        height: 'auto !important',
                        color: style.contrast,
                    },
                    '& .pad4': {
                        padding: 0.5,
                    },
                    bgcolor: 'white',
                    display: 'grid',
                    color: 'black',
                    ...dataGridProps.sx,
                    padding: 1,
                    '& .MuiDataGrid-row': {
                        display: 'flex',
                        alignItems: 'stretch',
                    },
                    '& .alt': {
                        bgcolor: 'lightblue',
                        color: 'black',
                        '&:hover': {
                            bgcolor: 'rgb(173, 216, 230, 0.8)',
                        },
                    },
                    '& .MuiDataGrid-cell': {
                        padding: 1,
                    },
                    '& .sub': {
                        bgcolor: style.header.bgcolor,
                        color: style.contrast,
                        '&:hover': {
                            bgcolor: lighten(style.header.bgcolor, 0.3),
                        },
                    },
                }}
                getRowClassName={(params) => {
                    const row = params.row
                    if (row.isAlt) return 'alt'
                    if (row.isSub) return 'sub'
                    return ''
                }}
                {...dataGridProps}
            />
        </Box>
    );
}
