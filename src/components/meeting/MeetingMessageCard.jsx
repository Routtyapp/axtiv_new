import { Clock, MapPin, Users, Calendar } from 'lucide-react'
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { Badge } from '../ui'

const MeetingMessageCard = ({ meetingData }) => {
    const formatDateTime = (dateTimeString) => {
        const date = new Date(dateTimeString)
        return format(date, 'M월 d일 (EEE) HH:mm', { locale: ko })
    }

    const getMeetingStatus = (startTime, endTime) => {
        const now = new Date()
        const start = new Date(startTime)
        const end = new Date(endTime)

        if (now < start) {
            return { status: 'upcoming', label: '예정', color: 'blue' }
        } else if (now >= start && now <= end) {
            return { status: 'ongoing', label: '진행중', color: 'green' }
        } else {
            return { status: 'completed', label: '완료', color: 'gray' }
        }
    }

    const { label, color } = getMeetingStatus(meetingData.start_time, meetingData.end_time)

    return (
        <div className="border rounded-xl p-6 bg-blue-50 border-blue-200 w-full max-w-full sm:max-w-2xl shadow-sm">
            {/* 헤더 */}
            <div className="flex items-center gap-3 mb-4">
                <Calendar className="h-6 w-6 text-blue-600 flex-shrink-0" />
                <h4 className="font-semibold text-lg text-blue-900 flex-1 line-clamp-2">{meetingData.title}</h4>
                <Badge
                    variant="outline"
                    className={`border-${color}-200 text-${color}-700 bg-${color}-50 flex-shrink-0 px-3 py-1 text-sm`}
                >
                    {label}
                </Badge>
            </div>

            {/* 회의 정보 */}
            <div className="space-y-3 text-base text-gray-700">
                {/* 시간 */}
                <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 mt-0.5 flex-shrink-0 text-gray-500" />
                    <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-medium whitespace-nowrap">{formatDateTime(meetingData.start_time)}</span>
                        <span className="text-gray-500 whitespace-nowrap">~ {formatDateTime(meetingData.end_time)}</span>
                    </div>
                </div>

                {/* 장소 */}
                {meetingData.location && (
                    <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 flex-shrink-0 text-gray-500" />
                        <span className="truncate">{meetingData.location}</span>
                    </div>
                )}

                {/* 참가자 */}
                <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 flex-shrink-0 text-gray-500" />
                    <span>참가자 {meetingData.participants?.length || 0}명</span>
                </div>
            </div>

            {/* 설명 */}
            {meetingData.description && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                    <p className="text-base text-gray-600 line-clamp-3">{meetingData.description}</p>
                </div>
            )}

            {/* 안내 텍스트 */}
            <div className="mt-4 text-sm text-gray-500 italic">
                📅 회의 정보가 공유되었습니다
            </div>
        </div>
    )
}

export default MeetingMessageCard