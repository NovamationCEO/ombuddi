import { ReferralSourceSelectionType } from '../types/majorTypes'

export function referralSelectionsAreValid(selections: ReferralSourceSelectionType[]) {
    return selections.every((selection) => (
        selection.behavior !== 'other_detail'
        || (typeof selection.detail === 'string' && !!selection.detail.trim())
    ))
}
