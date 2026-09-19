package com.dayuse.global.util

import java.time.LocalDate
import java.time.ZoneId

object DateTimeUtils {
    val KST_ZONE: ZoneId = ZoneId.of("Asia/Seoul")

    fun todayKst(): LocalDate = LocalDate.now(KST_ZONE)
}
