import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Button } from '../ui'
import ParticipantSelector from './ParticipantSelector'

const CreateMeetingDialog = ({
    open,
    onOpenChange,
    onMeetingCreated,
    workspaceId,
    currentUserId,
    defaultDate
}) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        start_time: '',
        end_time: '',
        location: ''
    })
    const [selectedParticipants, setSelectedParticipants] = useState([])
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState({})

    // defaultDate가 변경될 때마다 시작/종료 시간 업데이트
    useEffect(() => {
        if (defaultDate && open) {
            const selectedDate = new Date(defaultDate)
            // 다음 시간으로 반올림 (예: 현재 시간이 14:23이면 15:00으로 설정)
            const now = new Date()
            const startHour = now.getHours() + 1
            const startTime = new Date(selectedDate)
            startTime.setHours(startHour, 0, 0, 0)

            const endTime = new Date(startTime)
            endTime.setHours(startHour + 1, 0, 0, 0)

            // datetime-local 형식으로 변환
            const formatDateTime = (date) => {
                const year = date.getFullYear()
                const month = String(date.getMonth() + 1).padStart(2, '0')
                const day = String(date.getDate()).padStart(2, '0')
                const hours = String(date.getHours()).padStart(2, '0')
                const minutes = String(date.getMinutes()).padStart(2, '0')
                return `${year}-${month}-${day}T${hours}:${minutes}`
            }

            setFormData(prev => ({
                ...prev,
                start_time: formatDateTime(startTime),
                end_time: formatDateTime(endTime)
            }))
        }
    }, [defaultDate, open])

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }))

        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }))
        }
    }

    const validateForm = () => {
        const newErrors = {}

        if (!formData.title.trim()) {
            newErrors.title = '회의 제목을 입력해주세요'
        }

        if (!formData.start_time) {
            newErrors.start_time = '시작 시간을 선택해주세요'
        }

        if (!formData.end_time) {
            newErrors.end_time = '종료 시간을 선택해주세요'
        }

        if (formData.start_time && formData.end_time) {
            const startTime = new Date(formData.start_time)
            const endTime = new Date(formData.end_time)

            if (endTime <= startTime) {
                newErrors.end_time = '종료 시간은 시작 시간보다 늦어야 합니다'
            }

            if (startTime <= new Date()) {
                newErrors.start_time = '시작 시간은 현재 시간보다 늦어야 합니다'
            }
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleCreateMeeting = async () => {
        if (!validateForm()) return

        setLoading(true)

        try {
            const { data: meetingData, error: meetingError } = await supabase
                .from('meetings')
                .insert([{
                    workspace_id: workspaceId,
                    title: formData.title,
                    description: formData.description,
                    start_time: formData.start_time,
                    end_time: formData.end_time,
                    location: formData.location,
                    created_by: currentUserId
                }])
                .select()
                .single()

            if (meetingError) {
                console.error('Error creating meeting:', meetingError)
                alert('회의 생성 중 오류가 발생했습니다.')
                return
            }

            // Add host and selected participants
            const participantsToAdd = [
                {
                    meeting_id: meetingData.id,
                    user_id: currentUserId,
                    role: 'host'
                },
                ...selectedParticipants.map(userId => ({
                    meeting_id: meetingData.id,
                    user_id: userId,
                    role: 'participant'
                }))
            ]

            const { error: participantError } = await supabase
                .from('meeting_participants')
                .insert(participantsToAdd)

            if (participantError) {
                console.error('Error adding participants:', participantError)
            }

            setFormData({
                title: '',
                description: '',
                start_time: '',
                end_time: '',
                location: ''
            })
            setSelectedParticipants([])

            onMeetingCreated()
        } catch (error) {
            console.error('Error:', error)
            alert('회의 생성 중 오류가 발생했습니다.')
        } finally {
            setLoading(false)
        }
    }

    const handleCancel = () => {
        setFormData({
            title: '',
            description: '',
            start_time: '',
            end_time: '',
            location: ''
        })
        setSelectedParticipants([])
        setErrors({})
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">새 회의 만들기</DialogTitle>
                    <DialogDescription>
                        워크스페이스에서 새로운 회의를 생성합니다.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-4">
                        <Input
                            label="회의 제목 *"
                            placeholder="회의 제목을 입력하세요"
                            value={formData.title}
                            onChange={(e) => handleInputChange('title', e.target.value)}
                            error={errors.title}
                        />

                        <Input
                            label="회의 설명"
                            placeholder="회의에 대한 간단한 설명을 입력하세요"
                            multiline
                            rows={3}
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            error={errors.description}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="시작 시간 *"
                            type="datetime-local"
                            value={formData.start_time}
                            onChange={(e) => handleInputChange('start_time', e.target.value)}
                            error={errors.start_time}
                        />
                        <Input
                            label="종료 시간 *"
                            type="datetime-local"
                            value={formData.end_time}
                            onChange={(e) => handleInputChange('end_time', e.target.value)}
                            error={errors.end_time}
                        />
                    </div>

                    <Input
                        label="장소 (선택사항)"
                        placeholder="회의 장소나 온라인 링크를 입력하세요"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        error={errors.location}
                    />

                    <div className="border-t pt-4">
                        <ParticipantSelector
                            workspaceId={workspaceId}
                            currentUserId={currentUserId}
                            selectedParticipants={selectedParticipants}
                            onParticipantsChange={setSelectedParticipants}
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={handleCancel}
                        disabled={loading}
                    >
                        취소
                    </Button>
                    <Button
                        onClick={handleCreateMeeting}
                        disabled={loading}
                        className="min-w-[100px]"
                    >
                        {loading ? '생성 중...' : '회의 만들기'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default CreateMeetingDialog