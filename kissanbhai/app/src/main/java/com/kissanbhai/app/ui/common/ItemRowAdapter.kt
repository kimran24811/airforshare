package com.kissanbhai.app.ui.common

import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.kissanbhai.app.data.model.TransactionItem
import com.kissanbhai.app.databinding.ItemEntryRowBinding
import com.kissanbhai.app.util.CurrencyFormatter

class ItemRowAdapter(private val onChanged: () -> Unit) :
    RecyclerView.Adapter<ItemRowAdapter.RowHolder>() {

    private val rows = mutableListOf<TransactionItem>()

    fun addEmptyRow() {
        rows.add(TransactionItem())
        notifyItemInserted(rows.size - 1)
    }

    fun currentItems(): List<TransactionItem> = rows.toList()

    inner class RowHolder(private val b: ItemEntryRowBinding) : RecyclerView.ViewHolder(b.root) {
        private var blockListeners = false

        fun bind(item: TransactionItem) {
            blockListeners = true
            if (b.etItemName.text.toString() != item.name) b.etItemName.setText(item.name)
            b.etPrice.setText(if (item.price > 0) item.price.toLong().toString() else "")
            b.etPaid.setText(if (item.paid > 0) item.paid.toLong().toString() else "")
            updateBalance(item.price - item.paid)
            blockListeners = false

            b.etItemName.addTextChangedListener(watcher {
                if (!blockListeners) {
                    val pos = bindingAdapterPosition
                    if (pos != RecyclerView.NO_ID.toInt() && pos < rows.size) {
                        rows[pos] = rows[pos].copy(name = it)
                        onChanged()
                    }
                }
            })
            b.etPrice.addTextChangedListener(watcher {
                if (!blockListeners) {
                    val pos = bindingAdapterPosition
                    if (pos != RecyclerView.NO_ID.toInt() && pos < rows.size) {
                        val price = it.toDoubleOrNull() ?: 0.0
                        rows[pos] = rows[pos].copy(price = price, balance = price - rows[pos].paid)
                        updateBalance(rows[pos].balance)
                        onChanged()
                    }
                }
            })
            b.etPaid.addTextChangedListener(watcher {
                if (!blockListeners) {
                    val pos = bindingAdapterPosition
                    if (pos != RecyclerView.NO_ID.toInt() && pos < rows.size) {
                        val paid = it.toDoubleOrNull() ?: 0.0
                        rows[pos] = rows[pos].copy(paid = paid, balance = rows[pos].price - paid)
                        updateBalance(rows[pos].balance)
                        onChanged()
                    }
                }
            })
        }

        private fun updateBalance(balance: Double) {
            b.tvBalance.text = if (balance <= 0) "✓" else CurrencyFormatter.format(balance)
            b.tvBalance.setTextColor(
                if (balance <= 0) b.root.context.getColor(android.R.color.holo_green_dark)
                else b.root.context.getColor(android.R.color.holo_red_dark)
            )
        }

        private fun watcher(action: (String) -> Unit) = object : TextWatcher {
            override fun afterTextChanged(s: Editable?) { action(s?.toString() ?: "") }
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
        RowHolder(ItemEntryRowBinding.inflate(LayoutInflater.from(parent.context), parent, false))

    override fun onBindViewHolder(holder: RowHolder, position: Int) = holder.bind(rows[position])
    override fun getItemCount() = rows.size
}
