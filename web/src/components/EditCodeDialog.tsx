import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material'
import { CodeSetterBox } from './CodeSetterBox'
import React from 'react'
import { useIoaOrgId } from '../tools/useIoaOrgId'
import { useGetter } from '../tools/db_tools/useGetter'
import { CaseType, OmbudsType } from '../types/majorTypes'
import { useUserId } from '../tools/useUserId'
import { useParams } from 'react-router-dom'

export function EditCodeDialog(props: { open: boolean; onClose: () => void }) {
    const { open, onClose } = props
    const [activeIoaCodes, setActiveIoaCodes] = React.useState<string[]>([])
    const [activeOrgCodes, setActiveOrgCodes] = React.useState<string[]>([])
    const caseId = useParams()
    const caseRes = useGetter<CaseType>(['get_case_by_id', caseId.caseId])
    const userId = useUserId()
    const ombudsRes = useGetter<OmbudsType>(['get_ombuds_by_id', userId])
    const organizationId = ombudsRes.data?.organizationId
    const ioaId = useIoaOrgId()

    console.log(caseRes.data)

    React.useEffect(() => {
        if (!caseRes.data) return
        setActiveIoaCodes(caseRes.data?.codes || [])
        setActiveOrgCodes(caseRes.data?.codes || [])
        console.log(caseRes.data.codes)
    }, [caseRes.data])

    function save() {}
    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullScreen
        >
            <DialogTitle>Edit Codes</DialogTitle>
            <DialogContent>
                <Stack
                    display={'flex'}
                    spacing={2}
                    direction={'row'}
                >
                    <CodeSetterBox
                        activeCodeIds={activeIoaCodes}
                        setActiveCodeIds={setActiveIoaCodes}
                        organizationId={ioaId}
                    />
                    <CodeSetterBox
                        activeCodeIds={activeOrgCodes}
                        setActiveCodeIds={setActiveOrgCodes}
                        organizationId={organizationId}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={onClose}
                    variant={'outlined'}
                >
                    Cancel
                </Button>
                <Button
                    onClick={save}
                    variant={'contained'}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    )
}
