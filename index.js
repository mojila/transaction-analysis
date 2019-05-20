const fs = require('fs')

console.log(`Waiting to Load Data ...`)

var file = null
var dataset = []

if (fs.existsSync('./transformed_data.txt')) {
    file = fs.readFileSync('./transformed_data.txt').toString()

    dataset = JSON.parse(file)
} else {
    file = fs.readFileSync('./transaction.csv').toString()

    console.log(`Waiting to Transforming Data ...`)

    for (let i = 0; i < file.split('\n').length; i++) {
        if (i > 0) {
            let data = file.split('\n')[i].split(',')

            dataset.push({
                invoice_number: Number(data[0]),
                stock_code: Number(data[1]),
                invoice_date: data[2],
                customer_id: Number(data[3]),
                country: data[4].replace('\r', ''),
            })
        }
    }

    console.log(`Waiting to Save Transformed Data ...`)

    fs.writeFileSync('./transformed_data.txt', JSON.stringify(dataset))
}

console.log(`Waiting to Collect Countries ...`)

var countries = new Set()

for (let i = 0; i < dataset.length; i++) {
    countries.add(dataset[i].country)
}

countries = Array.from(countries)

var group_by_countries = []

console.log(`Waiting to Grouping data by Countries ...`)

for (let i = 0; i < countries.length; i++) {
    group_by_countries.push({
        country: countries[i],
        transactions: dataset.filter(x => x.country === countries[i])
    })
}

console.log(`Waiting to Calculating Transaction by Countries ...`)

var transaction_count_by_country = []

for (let i = 0; i < group_by_countries.length; i++) {
    transaction_count_by_country.push({
        country: group_by_countries[i].country,
        transactions_number: group_by_countries[i].transactions.length
    })
}

transaction_count_by_country = transaction_count_by_country.sort((a, b) => {
    if (a.transactions_number > b.transactions_number) return 1;
    if (b.transactions_number > a.transactions_number) return -1;

    return 0;
})

// Clustering

console.log(`Waiting to Clustering Data ...`)

let k = 3

let init_centroid = [
    {
        country: transaction_count_by_country[0].country,
        transactions_number: transaction_count_by_country[0].transactions_number,
        label: 'kecil'
    },
    {
        country: transaction_count_by_country[Math.floor((transaction_count_by_country.length - 1) / 2)].country,
        transactions_number: transaction_count_by_country[Math.floor((transaction_count_by_country.length - 1) / 2)].transactions_number,
        label: 'sedang'
    },
    {
        country: transaction_count_by_country[transaction_count_by_country.length - 1].country,
        transactions_number: transaction_count_by_country[transaction_count_by_country.length - 1].transactions_number,
        label: 'besar'
    }
]

let distance = (node1, node2) => {
    return Math.abs(node1.transactions_number - node2.transactions_number)
}

let search_centroid = () => {
    for (let i = 0; i < transaction_count_by_country.length; i++) {
        let distances = []
    
        for (let j = 0; j < init_centroid.length; j++) {
            let node = init_centroid[j]
            node.distance = distance(transaction_count_by_country[i], init_centroid[j])
    
            distances.push(node)
        }
    
        transaction_count_by_country[i].label = distances.sort((a, b) => {
            if (a.distance > b.distance) return 1;
            if (b.distance > a.distance) return -1;
    
            return 0;
        })[0].label

        transaction_count_by_country[i].centroid = distances.sort((a, b) => {
            if (a.distance > b.distance) return 1;
            if (b.distance > a.distance) return -1;
    
            return 0;
        })[0]
    }
}

var new_centroid = Array(k)

let average_group = (group) => {
    let sorted = group.sort((a, b) => {
        if (a.transactions_number > b.transactions_number) return 1;
        if (b.transactions_number > a.transactions_number) return -1;
    
        return 0;
    })

    return {
        country: sorted[Math.floor((sorted.length - 1) / 2)].country,
        transactions_number: sorted[Math.floor((sorted.length - 1) / 2)].transactions_number,
        label: sorted[Math.floor((sorted.length - 1) / 2)].label
    }
}

let generate_new_centroid = () => {
    for (let i = 0; i < init_centroid.length; i++) {
        let group = transaction_count_by_country.filter(x => x.centroid.label === init_centroid[i].label)
        
        new_centroid[i] = average_group(group)
    }

    if (JSON.stringify(init_centroid) === JSON.stringify(new_centroid)) {
        console.log(`=============================\nBesar :\n=============================`)
        transaction_count_by_country.filter(x => x.label === 'besar').map((d, i) => {
            console.log(d.country)
        })
        console.log(`=============================\nSedang :\n=============================`)
        transaction_count_by_country.filter(x => x.label === 'sedang').map((d, i) => {
            console.log(d.country)
        })
        console.log(`=============================\nKecil :\n=============================`)
        transaction_count_by_country.filter(x => x.label === 'kecil').map((d, i) => {
            console.log(d.country)
        })
    } else {
        init_centroid = new_centroid

        search_centroid()
        generate_new_centroid()
    }
}

search_centroid()

generate_new_centroid()

// console.log(transaction_count_by_country)