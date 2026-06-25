package com.kissanbhai.app.ui.common

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.kissanbhai.app.data.model.Transaction
import com.kissanbhai.app.databinding.ItemTransactionBinding
import com.kissanbhai.app.util.CurrencyFormatter
import java.text.SimpleDateFormat
import java.util.Locale

class TransactionListAdapter(
    private val onClick: (Transaction) -> Unit
) : ListAdapter<Transaction, TransactionListAdapter.ViewHolder>(Diff) {

    inner class ViewHolder(private val b: ItemTransactionBinding) : RecyclerView.ViewHolder(b.root) {
        fun bind(txn: Transaction) {
            val sdf = SimpleDateFormat("dd MMM", Locale.getDefault())
            b.tvCustomerName.text = txn.customerName
            b.tvDate.text = txn.date?.toDate()?.let { sdf.format(it) } ?: ""
            b.tvBalance.text = CurrencyFormatter.format(txn.totalBalance)
            val color = if (txn.totalBalance > 0)
                b.root.context.getColor(android.R.color.holo_red_dark)
            else b.root.context.getColor(android.R.color.holo_green_dark)
            b.tvBalance.setTextColor(color)

            if (txn.description.isNotBlank()) {
                b.tvDescription.text = txn.description
                b.tvDescription.visibility = View.VISIBLE
            } else {
                b.tvDescription.visibility = View.GONE
            }
            b.tvCategory.text = if (txn.category == "pesticide") "🌿" else "☀️"
            b.root.setOnClickListener { onClick(txn) }
        }
    }

    object Diff : DiffUtil.ItemCallback<Transaction>() {
        override fun areItemsTheSame(a: Transaction, b: Transaction) = a.id == b.id
        override fun areContentsTheSame(a: Transaction, b: Transaction) = a == b
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
        ViewHolder(ItemTransactionBinding.inflate(LayoutInflater.from(parent.context), parent, false))

    override fun onBindViewHolder(holder: ViewHolder, position: Int) = holder.bind(getItem(position))
}
