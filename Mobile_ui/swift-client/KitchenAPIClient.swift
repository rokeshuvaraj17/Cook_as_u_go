import Foundation

// MARK: - Errors

public enum KitchenAPIError: LocalizedError {
    case invalidURL
    case httpStatus(Int, message: String?)
    case decoding(Error)
    case transport(Error)

    public var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid API URL."
        case let .httpStatus(code, message):
            return message ?? "Request failed (HTTP \(code))."
        case let .decoding(err):
            return "Could not read response: \(err.localizedDescription)"
        case let .transport(err):
            return err.localizedDescription
        }
    }
}

// MARK: - Production hosts (Render)

/// Bundled defaults for the Cook As U Go deployment; use `KitchenAPIClient(baseURL: KitchenAPIProduction.kitchenBaseURL)`.
public enum KitchenAPIProduction {
    public static let kitchenBaseURL = URL(string: "https://cook-as-u-go.onrender.com")!
    /// FastAPI ScanAndSave; the mobile app posts receipts to the kitchen API, which proxies here (`SCAN_API_URL` on the server).
    public static let scanBaseURL = URL(string: "https://cook-as-u-go-scan.onrender.com")!
}

// MARK: - DTOs (kitchen Backend `/api/*`)

public struct HealthResponse: Decodable {
    public let ok: Bool?
    public let service: String?
    public let time: String?
}

public struct AuthUser: Decodable {
    public let id: String
    public let email: String
    public let name: String
}

public struct AuthResponse: Decodable {
    public let user: AuthUser
    public let token: String
}

public struct ApiSetting: Decodable {
    public let id: String
    public let userId: String?
    public let label: String
    public let apiType: String
    public let provider: String?
    public let model: String?
    public let baseUrl: String
    public let apiKey: String?
    public let isDefault: Bool
    public let createdAt: String?
    public let updatedAt: String?
}

public struct KitchenItemDTO: Decodable {
    public let id: String
    public let name: String
    public let amount: Double
    public let unit: String
    public let step: Double?
    public let note: String?
    public let ingredientId: String?
    public let expiryDate: String?
    public let isAvailable: Bool?
    public let updatedAt: String?
}

public struct ScanPreviewItem: Decodable {
    public let rawName: String
    public let normalizedName: String?
    public let category: String?
    public let price: Double?
    public let quantity: Double?
    public let unit: String?
    public let lineSubtotal: Double?
    public let lineTax: Double?
    public let lineTotal: Double?
    public let estimatedExpirationDate: String?
}

public struct ScanPreviewResponse: Decodable {
    public let merchant: String
    public let date: String?
    public let locationText: String?
    public let total: Double?
    public let subtotal: Double?
    public let tax: Double?
    public let items: [ScanPreviewItem]
}

public struct BillListItem: Decodable {
    public let id: String
    public let merchantName: String
    public let billedAt: String?
    public let locationText: String?
}

public struct BillDetailItem: Decodable {
    public let id: String
    public let rawName: String
    public let normalizedName: String?
    public let category: String?
}

public struct BillDetail: Decodable {
    public let id: String
    public let merchantName: String
    public let billedAt: String?
    public let locationText: String?
    public let items: [BillDetailItem]
}

public struct SaveBillAndAddBody: Encodable {
    public struct Line: Encodable {
        public let rawName: String
        public let normalizedName: String?
        public let category: String?
        public let quantity: Double?
        public let unit: String?
        public let unitPrice: Double?
        public let lineSubtotal: Double?
        public let lineTax: Double?
        public let lineTotal: Double?

        public init(
            rawName: String,
            normalizedName: String? = nil,
            category: String? = nil,
            quantity: Double? = nil,
            unit: String? = nil,
            unitPrice: Double? = nil,
            lineSubtotal: Double? = nil,
            lineTax: Double? = nil,
            lineTotal: Double? = nil
        ) {
            self.rawName = rawName
            self.normalizedName = normalizedName
            self.category = category
            self.quantity = quantity
            self.unit = unit
            self.unitPrice = unitPrice
            self.lineSubtotal = lineSubtotal
            self.lineTax = lineTax
            self.lineTotal = lineTotal
        }
    }

    public let merchantName: String
    public let billedAt: String?
    public let locationText: String?
    public let subtotal: Double?
    public let taxAmount: Double?
    public let totalAmount: Double?
    public let taxRate: Double?
    public let items: [Line]

    public init(
        merchantName: String,
        billedAt: String? = nil,
        locationText: String? = nil,
        subtotal: Double? = nil,
        taxAmount: Double? = nil,
        totalAmount: Double? = nil,
        taxRate: Double? = nil,
        items: [Line]
    ) {
        self.merchantName = merchantName
        self.billedAt = billedAt
        self.locationText = locationText
        self.subtotal = subtotal
        self.taxAmount = taxAmount
        self.totalAmount = totalAmount
        self.taxRate = taxRate
        self.items = items
    }
}

public struct BillsReport: Decodable {
    public struct Totals: Decodable {
        public let billsCount: FlexibleNumber
        public let totalSpend: FlexibleNumber
        public let totalTax: FlexibleNumber

        public init(billsCount: FlexibleNumber, totalSpend: FlexibleNumber, totalTax: FlexibleNumber) {
            self.billsCount = billsCount
            self.totalSpend = totalSpend
            self.totalTax = totalTax
        }
    }

    public let totals: Totals

    public init(totals: Totals) {
        self.totals = totals
    }
}

/// Decodes JSON numbers encoded as strings (Postgres numeric).
public struct FlexibleNumber: Decodable {
    public let value: Double

    public init(value: Double) {
        self.value = value
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if let d = try? c.decode(Double.self) {
            value = d
            return
        }
        if let s = try? c.decode(String.self), let d = Double(s) {
            value = d
            return
        }
        throw DecodingError.dataCorruptedError(in: c, debugDescription: "Expected number or numeric string")
    }
}

// MARK: - Client

/// Talks to the Node **kitchen** API (`Backend/`), same routes as `Mobile_ui/src/services/api.ts`.
/// Set `baseURL` to your server origin with **no** trailing slash (e.g. `http://192.168.1.10:5051`).
public final class KitchenAPIClient: @unchecked Sendable {
    public let baseURL: URL
    public let session: URLSession
    private let jsonDecoder: JSONDecoder
    private let jsonEncoder: JSONEncoder

    public init(baseURL: URL, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
        let dec = JSONDecoder()
        dec.keyDecodingStrategy = .convertFromSnakeCase
        jsonDecoder = dec
        let enc = JSONEncoder()
        enc.keyEncodingStrategy = .convertToSnakeCase
        jsonEncoder = enc
    }

    // MARK: Auth

    public func fetchHealth() async throws -> HealthResponse {
        try await get("/api/health", authorized: false)
    }

    public func register(email: String, password: String, name: String?) async throws -> AuthResponse {
        struct Body: Encodable {
            let email: String
            let password: String
            let name: String?
        }
        return try await post("/api/auth/register", body: Body(email: email, password: password, name: name), authorized: false)
    }

    public func login(email: String, password: String) async throws -> AuthResponse {
        struct Body: Encodable {
            let email: String
            let password: String
        }
        return try await post("/api/auth/login", body: Body(email: email, password: password), authorized: false)
    }

    public func changePassword(token: String, currentPassword: String, newPassword: String) async throws {
        struct Body: Encodable {
            let currentPassword: String
            let newPassword: String
        }
        try await postVoid("/api/auth/change-password", body: Body(currentPassword: currentPassword, newPassword: newPassword), token: token)
    }

    // MARK: Pantry (kitchen items)

    public func fetchKitchenItems(token: String) async throws -> [KitchenItemDTO] {
        struct Wrap: Decodable {
            let items: [KitchenItemDTO]
        }
        let w: Wrap = try await get("/api/kitchen/items", token: token)
        return w.items
    }

    public func createKitchenItem(token: String, name: String, amount: Double, unit: String, note: String?, step: Double?) async throws -> KitchenItemDTO {
        struct Body: Encodable {
            let name: String
            let amount: Double
            let unit: String
            let note: String?
            let step: Double?
        }
        struct Wrap: Decodable {
            let item: KitchenItemDTO
        }
        let w: Wrap = try await post("/api/kitchen/items", body: Body(name: name, amount: amount, unit: unit, note: note, step: step), token: token)
        return w.item
    }

    public func updateKitchenItem(
        token: String,
        id: String,
        name: String? = nil,
        amount: Double? = nil,
        unit: String? = nil,
        note: String? = nil,
        step: Double? = nil,
        expiryDate: String? = nil,
        isAvailable: Bool? = nil
    ) async throws -> KitchenItemDTO {
        struct Body: Encodable {
            let name: String?
            let amount: Double?
            let unit: String?
            let note: String?
            let step: Double?
            let expiryDate: String?
            let isAvailable: Bool?
        }
        struct Wrap: Decodable {
            let item: KitchenItemDTO
        }
        let path = "/api/kitchen/items/\(id.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? id)"
        let w: Wrap = try await patch(path, body: Body(name: name, amount: amount, unit: unit, note: note, step: step, expiryDate: expiryDate, isAvailable: isAvailable), token: token)
        return w.item
    }

    public func deleteKitchenItem(token: String, id: String) async throws {
        let path = "/api/kitchen/items/\(id.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? id)"
        try await delete204(path, token: token)
    }

    // MARK: User API settings

    public func listUserApiSettings(token: String) async throws -> [ApiSetting] {
        struct Wrap: Decodable {
            let items: [ApiSetting]
        }
        let w: Wrap = try await get("/api/user-api-settings", token: token)
        return w.items
    }

    public func createUserApiSetting(
        token: String,
        label: String?,
        apiType: String,
        provider: String?,
        model: String?,
        baseUrl: String,
        apiKey: String?,
        isDefault: Bool?
    ) async throws -> ApiSetting {
        struct Body: Encodable {
            let label: String?
            let apiType: String
            let provider: String?
            let model: String?
            let baseUrl: String
            let apiKey: String?
            let isDefault: Bool?

            enum CodingKeys: String, CodingKey {
                case label
                case apiType = "api_type"
                case provider
                case model
                case baseUrl = "base_url"
                case apiKey = "api_key"
                case isDefault = "is_default"
            }
        }
        struct Wrap: Decodable {
            let item: ApiSetting
        }
        let w: Wrap = try await post(
            "/api/user-api-settings",
            body: Body(label: label, apiType: apiType, provider: provider, model: model, baseUrl: baseUrl, apiKey: apiKey, isDefault: isDefault),
            token: token
        )
        return w.item
    }

    // MARK: Receipt preview (multipart)

    public func uploadReceiptForPreview(token: String, imageData: Data, filename: String = "receipt.jpg", mimeType: String = "image/jpeg") async throws -> ScanPreviewResponse {
        let url = baseURL.appendingPathComponent("api/scan/receipt-preview")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        let boundary = "Boundary-\(UUID().uuidString)"
        req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        let crlf = "\r\n"
        body.append("--\(boundary)\(crlf)".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(filename)\"\(crlf)".data(using: .utf8)!)
        body.append("Content-Type: \(mimeType)\(crlf)\(crlf)".data(using: .utf8)!)
        body.append(imageData)
        body.append(crlf.data(using: .utf8)!)
        body.append("--\(boundary)--\(crlf)".data(using: .utf8)!)
        req.httpBody = body

        let (data, response) = try await session.data(for: req)
        guard let http = response as? HTTPURLResponse else {
            throw KitchenAPIError.transport(URLError(.badServerResponse))
        }
        if !(200 ... 299).contains(http.statusCode) {
            throw KitchenAPIError.httpStatus(http.statusCode, message: Self.parseMessage(from: data))
        }
        do {
            return try jsonDecoder.decode(ScanPreviewResponse.self, from: data)
        } catch {
            throw KitchenAPIError.decoding(error)
        }
    }

    // MARK: Bills (minimal helpers)

    public func fetchBills(token: String) async throws -> [BillListItem] {
        struct Wrap: Decodable {
            let bills: [BillListItem]
        }
        let w: Wrap = try await get("/api/bills", token: token)
        return w.bills
    }

    public func fetchBillDetail(token: String, id: String) async throws -> BillDetail {
        struct Wrap: Decodable {
            let bill: BillDetail
        }
        let path = "/api/bills/\(id.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? id)"
        let w: Wrap = try await get(path, token: token)
        return w.bill
    }

    public func deleteBill(token: String, id: String) async throws {
        let path = "/api/bills/\(id.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? id)"
        try await delete204(path, token: token)
    }

    /// Persists the bill and merges line items into pantry (`POST /api/bills/save-and-add`).
    public func saveBillAndAddPantry(token: String, body: SaveBillAndAddBody) async throws {
        try await postVoid("/api/bills/save-and-add", body: body, token: token)
    }

    public func fetchBillsReport(token: String, queryItems: [URLQueryItem] = []) async throws -> BillsReport {
        var comp = URLComponents(url: baseURL.appendingPathComponent("api/bills/report"), resolvingAgainstBaseURL: false)!
        if !queryItems.isEmpty {
            comp.queryItems = queryItems
        }
        guard let url = comp.url else { throw KitchenAPIError.invalidURL }
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let (data, response) = try await session.data(for: req)
        guard let http = response as? HTTPURLResponse else {
            throw KitchenAPIError.transport(URLError(.badServerResponse))
        }
        if !(200 ... 299).contains(http.statusCode) {
            throw KitchenAPIError.httpStatus(http.statusCode, message: Self.parseMessage(from: data))
        }
        struct Wrap: Decodable {
            let report: BillsReport?
        }
        do {
            let w = try jsonDecoder.decode(Wrap.self, from: data)
            let zero = FlexibleNumber(value: 0)
            let emptyTotals = BillsReport.Totals(billsCount: zero, totalSpend: zero, totalTax: zero)
            return w.report ?? BillsReport(totals: emptyTotals)
        } catch {
            throw KitchenAPIError.decoding(error)
        }
    }

    public func revertLatestBill(token: String) async throws -> RevertLatestBillResponse {
        struct Wrap: Decodable {
            let revertedBillId: String
            let adjustedItems: Int?
            enum CodingKeys: String, CodingKey {
                case revertedBillId = "reverted_bill_id"
                case adjustedItems = "adjusted_items"
            }
        }
        let w: Wrap = try await post("/api/bills/revert-latest", body: EmptyEncodable(), token: token)
        return RevertLatestBillResponse(revertedBillId: w.revertedBillId, adjustedItems: w.adjustedItems)
    }

    public struct RevertLatestBillResponse {
        public let revertedBillId: String
        public let adjustedItems: Int?
    }

    // MARK: Internals

    private struct EmptyEncodable: Encodable {}

    private struct MessageBody: Decodable {
        let message: String?
    }

    private static func parseMessage(from data: Data) -> String? {
        guard !data.isEmpty else { return nil }
        return (try? JSONDecoder().decode(MessageBody.self, from: data))?.message
    }

    private func get<T: Decodable>(_ path: String, token: String? = nil, authorized: Bool = true) async throws -> T {
        try await dataRequest(path, method: "GET", body: nil as Data?, token: token, authorized: authorized)
    }

    private func post<T: Decodable, B: Encodable>(_ path: String, body: B, token: String? = nil, authorized: Bool = true) async throws -> T {
        let data = try jsonEncoder.encode(body)
        return try await dataRequest(path, method: "POST", body: data, token: token, authorized: authorized)
    }

    private func postVoid<B: Encodable>(_ path: String, body: B, token: String) async throws {
        let data = try jsonEncoder.encode(body)
        try await voidRequest(path, method: "POST", body: data, token: token)
    }

    private func patch<T: Decodable, B: Encodable>(_ path: String, body: B, token: String) async throws -> T {
        let data = try jsonEncoder.encode(body)
        return try await dataRequest(path, method: "PATCH", body: data, token: token, authorized: true)
    }

    private func delete204(_ path: String, token: String) async throws {
        try await voidRequest(path, method: "DELETE", body: nil, token: token, acceptNoContent: true)
    }

    private func dataRequest<T: Decodable>(
        _ path: String,
        method: String,
        body: Data?,
        token: String?,
        authorized: Bool = true
    ) async throws -> T {
        guard let url = URL(string: path, relativeTo: baseURL)?.absoluteURL else {
            throw KitchenAPIError.invalidURL
        }
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = body
        }
        if authorized {
            guard let token, !token.isEmpty else {
                throw KitchenAPIError.httpStatus(401, message: "Missing auth token.")
            }
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await session.data(for: req)
        } catch {
            throw KitchenAPIError.transport(error)
        }
        guard let http = response as? HTTPURLResponse else {
            throw KitchenAPIError.transport(URLError(.badServerResponse))
        }
        if !(200 ... 299).contains(http.statusCode) {
            throw KitchenAPIError.httpStatus(http.statusCode, message: Self.parseMessage(from: data))
        }
        do {
            return try jsonDecoder.decode(T.self, from: data)
        } catch {
            throw KitchenAPIError.decoding(error)
        }
    }

    private func voidRequest(
        _ path: String,
        method: String,
        body: Data?,
        token: String,
        acceptNoContent: Bool = false
    ) async throws {
        guard let url = URL(string: path, relativeTo: baseURL)?.absoluteURL else {
            throw KitchenAPIError.invalidURL
        }
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        if let body {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = body
        }
        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await session.data(for: req)
        } catch {
            throw KitchenAPIError.transport(error)
        }
        guard let http = response as? HTTPURLResponse else {
            throw KitchenAPIError.transport(URLError(.badServerResponse))
        }
        if http.statusCode == 204 { return }
        if acceptNoContent, data.isEmpty, (200 ... 299).contains(http.statusCode) { return }
        if !(200 ... 299).contains(http.statusCode) {
            throw KitchenAPIError.httpStatus(http.statusCode, message: Self.parseMessage(from: data))
        }
    }
}
