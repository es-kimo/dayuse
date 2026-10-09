package com.dayuse.domain.announcement

import com.dayuse.domain.announcement.dto.AnnouncementUpsertRequest
import com.dayuse.domain.announcement.service.AnnouncementService
import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Component
import java.time.LocalDateTime

/**
 * 기동 시 dayuse 서비스에 알맞은 기본 안내 공지들을 멱등하게 시드합니다.
 *
 * 이미 등록된 소식이 존재하는 경우 중복 생성하지 않습니다.
 */
@Component
@ConditionalOnProperty(
    name = ["announcement.seed.enabled"],
    havingValue = "true",
    matchIfMissing = false
)
class AnnouncementDataSeeder(
    private val announcementRepository: AnnouncementRepository,
    private val announcementService: AnnouncementService
) : ApplicationRunner {

    private val log = LoggerFactory.getLogger(javaClass)

    override fun run(args: ApplicationArguments?) {
        seed()
    }

    fun seed() {
        if (announcementRepository.count() > 0) {
            log.info("Announcement 데이터가 이미 존재하여 시드를 건너뜁니다.")
            return
        }

        val baseNow = LocalDateTime.now()

        for (seed in DEFAULT_ANNOUNCEMENTS) {
            try {
                val created = announcementService.createDraft(
                    actorId = 1L,
                    request = seed.upsertRequest,
                    now = baseNow.minusDays(seed.daysAgo)
                )

                if (seed.autoPublish) {
                    announcementService.publishAnnouncement(
                        actorId = 1L,
                        announcementId = created.id,
                        request = com.dayuse.domain.announcement.dto.AnnouncementPublishRequest(
                            publishAt = baseNow.minusDays(seed.daysAgo),
                            noticeEndsAt = baseNow.plusDays(seed.durationDays - seed.daysAgo)
                        ),
                        now = baseNow.minusDays(seed.daysAgo)
                    )
                }
                log.info("기본 소식 시드 생성 완료: id={}, title={}", created.id, seed.upsertRequest.title)
            } catch (ex: Exception) {
                log.warn("기본 소식 시드 생성 중 오류 발생: title={}", seed.upsertRequest.title, ex)
            }
        }
    }

    data class AnnouncementSeedItem(
        val upsertRequest: AnnouncementUpsertRequest,
        val autoPublish: Boolean = true,
        val daysAgo: Long = 0,
        val durationDays: Long = 14
    )

    companion object {
        val DEFAULT_ANNOUNCEMENTS: List<AnnouncementSeedItem> = listOf(
            // 1. 클립보드 이미지 붙여넣기 안내 (진행 중인 활성 공지, 인증 화면 인라인 노출)
            // 인증 작성 화면 내에서 제공되는 사용 팁이므로 순환 이동 CTA 없이 안내 자체로 완결
            AnnouncementSeedItem(
                upsertRequest = AnnouncementUpsertRequest(
                    title = "인증 화면 이미지 바로 붙여넣기 지원",
                    summary = "촬영하거나 캡처한 이미지를 복사(Ctrl+V / Cmd+V)하여 바로 인증할 수 있어요.",
                    body = """
## 이제 더 빠르게 인증하세요!
인증 사진을 찍거나 캡처한 뒤, 파일 선택 없이 **바로 붙여넣기(Cmd+V / Ctrl+V)**로 간편하게 첨부할 수 있습니다.

- PC 및 태블릿 웹 브라우저 지원
- 클립보드에 복사된 이미지 자동 감지 및 미리보기
- 최대 5MB까지 자동 최적화 업로드

### 사용 방법
1. 오늘 진행한 습관 인증 사진을 캡처하거나 복사합니다.
2. 데이유 인증 작성 화면에서 본문 영역을 클릭하고 붙여넣기를 누릅니다.
3. 첨부된 이미지를 확인하고 인증을 완료하세요!
                    """.trimIndent(),
                    imageUrl = "/assets/announcements/clipboard-paste-guide.png",
                    imageAlt = "클립보드 이미지 붙여넣기 안내 일러스트",
                    ctaLabel = null,
                    ctaTarget = null,
                    placement = AnnouncementPlacement.CERT_CREATE,
                    homeVisible = false,
                    featureKey = "clipboard_image_paste"
                ),
                autoPublish = true,
                daysAgo = 1,
                durationDays = 14
            ),

            // 2. 리데이(스트릭 복구권) 제도 안내 (진행 중인 홈 공지)
            // 홈 카드에서 모임 또는 리데이 기능 화면으로 바로 연결
            AnnouncementSeedItem(
                upsertRequest = AnnouncementUpsertRequest(
                    title = "아쉽게 놓친 스트릭, '리데이'로 지켜보세요",
                    summary = "어제 하루 깜빡했더라도 걱정 마세요! 리데이 티켓으로 소중한 연속 기록을 이어갈 수 있습니다.",
                    body = """
## 연속 인증의 든든한 지원군, 리데이
열심히 이어오던 습관 기록이 하루의 바쁜 일정 때문에 끊겨 아쉬우셨나요?
이제 데이유의 **리데이(Re-Day) 티켓**으로 어제의 인증을 안전하게 복구할 수 있습니다.

### 리데이 활용 팁
- 당일 자정 전까지 리데이 티켓을 사용해 어제 날짜의 인증 기록을 복구할 수 있어요.
- 모임원들과 함께 달성률을 유지하고 페널티 정산을 방어하세요.
- 놓친 기록이 있는 경우 각 모임 홈 상단에서 바로 리데이를 사용할 수 있습니다.
                    """.trimIndent(),
                    imageUrl = "/assets/announcements/reday-ticket-guide.png",
                    imageAlt = "리데이 티켓 사용 안내 이미지",
                    ctaLabel = "리데이 내역 확인하기",
                    ctaTarget = AnnouncementActionTarget.REDAY_HISTORY,
                    placement = null,
                    homeVisible = true,
                    featureKey = "reday"
                ),
                autoPublish = true,
                daysAgo = 3,
                durationDays = 21
            ),

            // 3. 웹 푸시 알림 설정 안내 (전체 소식 목록에서 상시 열람 가능한 소식)
            AnnouncementSeedItem(
                upsertRequest = AnnouncementUpsertRequest(
                    title = "오늘의 인증 리마인더, 웹 푸시 알림 켜기",
                    summary = "인증 마감 시간을 놓치지 않도록 원하는 시간에 데이유가 다정하게 알려드릴게요.",
                    body = """
## 잊지 않고 인증하는 가장 확실한 방법
매일 저녁 '아 맞다 인증!' 하고 놀란 적 있으신가요?
브라우저 웹 푸시 알림을 켜두시면 내가 정한 인증 시간에 맞춰 푸시 알림을 보내드립니다.

- **원하는 알림 시간 설정**: 퇴근길, 취침 전 등 내 생활 패턴에 맞게 설정 가능
- **친구들의 인증 소식**: 모임원들이 오늘 인증을 올렸을 때 실시간 자극 피드 제공
- 마이페이지 알림 설정 메뉴에서 언제든지 켜고 끌 수 있습니다.
                    """.trimIndent(),
                    ctaLabel = "알림 설정하러 가기",
                    ctaTarget = AnnouncementActionTarget.MY_PAGE,
                    placement = null,
                    homeVisible = false
                ),
                autoPublish = true,
                daysAgo = 7,
                durationDays = 30
            )
        )
    }
}
