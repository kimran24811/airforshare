package com.kissanbhai.app.util

import java.text.NumberFormat
import java.util.Locale

object CurrencyFormatter {
    fun format(amount: Double): String {
        val nf = NumberFormat.getNumberInstance(Locale.getDefault())
        nf.maximumFractionDigits = 0
        nf.minimumFractionDigits = 0
        return "₨ ${nf.format(amount)}"
    }
}
