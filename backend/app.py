import os
import uuid
from datetime import datetime

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
from sqlalchemy import text


# =========================================================
# LOAD ENVIRONMENT VARIABLES
# =========================================================

load_dotenv(
    os.path.join(os.path.dirname(__file__), ".env"),
    override=True
)


# =========================================================
# FLASK APP
# =========================================================

app = Flask(__name__)


# =========================================================
# DATABASE CONFIGURATION
# =========================================================

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not configured.")

# Fix old postgres:// format if present
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgres://",
        "postgresql://",
        1
    )

app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False


# =========================================================
# DATABASE
# =========================================================

db = SQLAlchemy(app)


# =========================================================
# CORS
# =========================================================

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": "*"
        }
    },
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"]
)


# =========================================================
# MODELS
# =========================================================

class Product(db.Model):

    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(
        db.String(200),
        nullable=False
    )

    category = db.Column(
        db.String(100),
        nullable=False
    )

    sub_category = db.Column(
        db.String(100),
        nullable=True
    )

    price = db.Column(
        db.Numeric(10, 2),
        nullable=False,
        default=0
    )

    old_price = db.Column(
        db.Numeric(10, 2),
        nullable=True
    )

    description = db.Column(
        db.Text,
        nullable=True
    )

    image_url = db.Column(
        db.Text,
        nullable=True
    )

    stock = db.Column(
        db.Integer,
        nullable=False,
        default=0
    )

    status = db.Column(
        db.String(50),
        nullable=False,
        default="Available"
    )

    created_at = db.Column(
        db.DateTime,
        server_default=text("CURRENT_TIMESTAMP")
    )

    updated_at = db.Column(
        db.DateTime,
        server_default=text("CURRENT_TIMESTAMP")
    )

    sizes = db.relationship(
        "ProductSize",
        backref="product",
        lazy=True,
        cascade="all, delete-orphan"
    )

    def to_dict(self):

        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "sub_category": self.sub_category,
            "price": float(self.price) if self.price is not None else 0,
            "old_price": (
                float(self.old_price)
                if self.old_price is not None
                else None
            ),
            "description": self.description,
            "image_url": self.image_url,
            "stock": self.stock,
            "status": self.status,
            "sizes": [
                size.to_dict()
                for size in self.sizes
            ],
            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else None
            ),
            "updated_at": (
                self.updated_at.isoformat()
                if self.updated_at
                else None
            )
        }


class ProductSize(db.Model):

    __tablename__ = "product_sizes"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.id"),
        nullable=False
    )

    size = db.Column(
        db.String(50),
        nullable=False
    )

    stock = db.Column(
        db.Integer,
        nullable=False,
        default=0
    )

    def to_dict(self):

        return {
            "id": self.id,
            "product_id": self.product_id,
            "size": self.size,
            "stock": self.stock
        }


class Order(db.Model):

    __tablename__ = "orders"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    order_id = db.Column(
        db.String(50),
        unique=True,
        nullable=False
    )

    customer_name = db.Column(
        db.String(200)
    )

    customer_phone = db.Column(
        db.String(50)
    )

    customer_email = db.Column(
        db.String(200)
    )

    items = db.Column(
        db.JSON,
        nullable=False
    )

    total = db.Column(
        db.Numeric(10, 2),
        nullable=False
    )

    status = db.Column(
        db.String(50),
        default="Pending"
    )

    created_at = db.Column(
        db.DateTime,
        server_default=text("CURRENT_TIMESTAMP")
    )

    def to_dict(self):

        return {
            "id": self.id,
            "order_id": self.order_id,
            "customer_name": self.customer_name,
            "customer_phone": self.customer_phone,
            "customer_email": self.customer_email,
            "items": self.items,
            "total": (
                float(self.total)
                if self.total is not None
                else 0
            ),
            "status": self.status,
            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else None
            )
        }


class ContactMessage(db.Model):

    __tablename__ = "contact_messages"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    name = db.Column(
        db.String(200),
        nullable=False
    )

    email = db.Column(
        db.String(200)
    )

    phone = db.Column(
        db.String(50)
    )

    message = db.Column(
        db.Text,
        nullable=False
    )

    created_at = db.Column(
        db.DateTime,
        server_default=text("CURRENT_TIMESTAMP")
    )

    def to_dict(self):

        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "message": self.message,
            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else None
            )
        }


# =========================================================
# HOME / TEST
# =========================================================

@app.route("/")
def home():

    return jsonify({
        "success": True,
        "message": "Sri Kumar Stores API is running"
    })


@app.route("/api/test", methods=["GET"])
def api_test():

    return jsonify({
        "success": True,
        "message": "API is working"
    })


# =========================================================
# DATABASE TEST
# =========================================================

@app.route("/api/db-test", methods=["GET"])
def db_test():

    try:

        result = db.session.execute(
            text("SELECT 1")
        )

        result.scalar()

        return jsonify({
            "success": True,
            "message": "Database connection successful"
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "success": False,
            "message": "Database connection failed",
            "error": str(e)
        }), 500


# =========================================================
# CREATE TABLES
# =========================================================

@app.route("/api/create-tables", methods=["GET"])
def create_tables():

    try:

        db.create_all()

        return jsonify({
            "success": True,
            "message": "Database tables created successfully"
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# PRODUCTS - GET ALL
# =========================================================

@app.route("/api/products", methods=["GET"])
def get_products():

    try:

        products = Product.query.order_by(
            Product.id.desc()
        ).all()

        return jsonify({
            "success": True,
            "products": [
                product.to_dict()
                for product in products
            ]
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# PRODUCTS - GET SINGLE
# =========================================================

@app.route("/api/products/<int:product_id>", methods=["GET"])
def get_product(product_id):

    try:

        product = db.session.get(
            Product,
            product_id
        )

        if not product:

            return jsonify({
                "success": False,
                "message": "Product not found"
            }), 404

        return jsonify({
            "success": True,
            "product": product.to_dict()
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# ADMIN - ADD PRODUCT
# =========================================================

@app.route("/api/admin/products", methods=["POST"])
def add_product():

    try:

        data = request.get_json()

        if not data:

            return jsonify({
                "success": False,
                "message": "Request body is required"
            }), 400

        name = data.get("name")
        category = data.get("category")
        price = data.get("price")

        if not name:
            return jsonify({
                "success": False,
                "message": "Product name is required"
            }), 400

        if not category:
            return jsonify({
                "success": False,
                "message": "Category is required"
            }), 400

        if price is None:
            return jsonify({
                "success": False,
                "message": "Price is required"
            }), 400

        product = Product(
            name=name,
            category=category,
            sub_category=data.get("sub_category"),
            price=price,
            old_price=data.get("old_price"),
            description=data.get("description"),
            image_url=data.get("image_url"),
            stock=data.get("stock", 0),
            status=data.get(
                "status",
                "Available"
            )
        )

        db.session.add(product)

        db.session.flush()

        sizes = data.get("sizes", [])

        if isinstance(sizes, list):

            for size_data in sizes:

                if isinstance(size_data, dict):

                    size_name = size_data.get("size")
                    size_stock = size_data.get(
                        "stock",
                        0
                    )

                else:

                    size_name = str(size_data)
                    size_stock = 0

                if size_name:

                    product_size = ProductSize(
                        product_id=product.id,
                        size=size_name,
                        stock=size_stock
                    )

                    db.session.add(
                        product_size
                    )

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Product added successfully",
            "product": product.to_dict()
        }), 201

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# ADMIN - UPDATE PRODUCT
# =========================================================

@app.route(
    "/api/admin/products/<int:product_id>",
    methods=["PUT"]
)
def update_product(product_id):

    try:

        product = db.session.get(
            Product,
            product_id
        )

        if not product:

            return jsonify({
                "success": False,
                "message": "Product not found"
            }), 404

        data = request.get_json()

        if not data:

            return jsonify({
                "success": False,
                "message": "Request body is required"
            }), 400

        if "name" in data:
            product.name = data["name"]

        if "category" in data:
            product.category = data["category"]

        if "sub_category" in data:
            product.sub_category = data["sub_category"]

        if "price" in data:
            product.price = data["price"]

        if "old_price" in data:
            product.old_price = data["old_price"]

        if "description" in data:
            product.description = data["description"]

        if "image_url" in data:
            product.image_url = data["image_url"]

        if "stock" in data:
            product.stock = data["stock"]

        if "status" in data:
            product.status = data["status"]

        product.updated_at = db.func.now()

        # Update sizes if supplied
        if "sizes" in data:

            ProductSize.query.filter_by(
                product_id=product.id
            ).delete()

            sizes = data.get("sizes", [])

            if isinstance(sizes, list):

                for size_data in sizes:

                    if isinstance(size_data, dict):

                        size_name = size_data.get(
                            "size"
                        )

                        size_stock = size_data.get(
                            "stock",
                            0
                        )

                    else:

                        size_name = str(
                            size_data
                        )

                        size_stock = 0

                    if size_name:

                        db.session.add(
                            ProductSize(
                                product_id=product.id,
                                size=size_name,
                                stock=size_stock
                            )
                        )

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Product updated successfully",
            "product": product.to_dict()
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# ADMIN - DELETE PRODUCT
# =========================================================

@app.route(
    "/api/admin/products/<int:product_id>",
    methods=["DELETE"]
)
def delete_product(product_id):

    try:

        product = db.session.get(
            Product,
            product_id
        )

        if not product:

            return jsonify({
                "success": False,
                "message": "Product not found"
            }), 404

        db.session.delete(product)

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Product deleted successfully"
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# ORDERS - GET ALL
# =========================================================

@app.route("/api/orders", methods=["GET"])
def get_orders():

    try:

        orders = Order.query.order_by(
            Order.id.desc()
        ).all()

        return jsonify({
            "success": True,
            "orders": [
                order.to_dict()
                for order in orders
            ]
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# ORDERS - CREATE
# =========================================================

@app.route("/api/orders", methods=["POST"])
def create_order():

    try:

        data = request.get_json()

        if not data:

            return jsonify({
                "success": False,
                "message": "Request body is required"
            }), 400

        items = data.get("items")

        if not items:

            return jsonify({
                "success": False,
                "message": "Order items are required"
            }), 400

        total = data.get("total", 0)

        order_id = (
            "SKS-"
            + datetime.now().strftime(
                "%Y%m%d%H%M%S"
            )
            + "-"
            + uuid.uuid4().hex[:6].upper()
        )

        order = Order(
            order_id=order_id,
            customer_name=data.get(
                "customer_name"
            ),
            customer_phone=data.get(
                "customer_phone"
            ),
            customer_email=data.get(
                "customer_email"
            ),
            items=items,
            total=total,
            status=data.get(
                "status",
                "Pending"
            )
        )

        db.session.add(order)

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Order created successfully",
            "order": order.to_dict()
        }), 201

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# ORDER - GET SINGLE
# =========================================================

@app.route(
    "/api/orders/<order_id>",
    methods=["GET"]
)
def get_order(order_id):

    try:

        order = Order.query.filter_by(
            order_id=order_id
        ).first()

        if not order:

            return jsonify({
                "success": False,
                "message": "Order not found"
            }), 404

        return jsonify({
            "success": True,
            "order": order.to_dict()
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# ORDER - UPDATE
# =========================================================

@app.route(
    "/api/orders/<order_id>",
    methods=["PUT"]
)
def update_order(order_id):

    try:

        order = Order.query.filter_by(
            order_id=order_id
        ).first()

        if not order:

            return jsonify({
                "success": False,
                "message": "Order not found"
            }), 404

        data = request.get_json()

        if data.get("customer_name") is not None:
            order.customer_name = data[
                "customer_name"
            ]

        if data.get("customer_phone") is not None:
            order.customer_phone = data[
                "customer_phone"
            ]

        if data.get("customer_email") is not None:
            order.customer_email = data[
                "customer_email"
            ]

        if "items" in data:
            order.items = data["items"]

        if "total" in data:
            order.total = data["total"]

        if "status" in data:
            order.status = data["status"]

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Order updated successfully",
            "order": order.to_dict()
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# ORDER - DELETE
# =========================================================

@app.route(
    "/api/orders/<order_id>",
    methods=["DELETE"]
)
def delete_order(order_id):

    try:

        order = Order.query.filter_by(
            order_id=order_id
        ).first()

        if not order:

            return jsonify({
                "success": False,
                "message": "Order not found"
            }), 404

        db.session.delete(order)

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Order deleted successfully"
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# CONTACT MESSAGES - GET ALL
# =========================================================

@app.route(
    "/api/contact-messages",
    methods=["GET"]
)
def get_contact_messages():

    try:

        messages = ContactMessage.query.order_by(
            ContactMessage.id.desc()
        ).all()

        return jsonify({
            "success": True,
            "messages": [
                message.to_dict()
                for message in messages
            ]
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# CONTACT MESSAGE - CREATE
# =========================================================

@app.route(
    "/api/contact-messages",
    methods=["POST"]
)
def create_contact_message():

    try:

        data = request.get_json()

        if not data:

            return jsonify({
                "success": False,
                "message": "Request body is required"
            }), 400

        name = data.get("name")
        message = data.get("message")

        if not name:

            return jsonify({
                "success": False,
                "message": "Name is required"
            }), 400

        if not message:

            return jsonify({
                "success": False,
                "message": "Message is required"
            }), 400

        contact = ContactMessage(
            name=name,
            email=data.get("email"),
            phone=data.get("phone"),
            message=message
        )

        db.session.add(contact)

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Message sent successfully",
            "data": contact.to_dict()
        }), 201

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# CONTACT MESSAGE - GET SINGLE
# =========================================================

@app.route(
    "/api/contact-messages/<int:message_id>",
    methods=["GET"]
)
def get_contact_message(message_id):

    try:

        message = db.session.get(
            ContactMessage,
            message_id
        )

        if not message:

            return jsonify({
                "success": False,
                "message": "Message not found"
            }), 404

        return jsonify({
            "success": True,
            "message": message.to_dict()
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# CONTACT MESSAGE - DELETE
# =========================================================

@app.route(
    "/api/contact-messages/<int:message_id>",
    methods=["DELETE"]
)
def delete_contact_message(message_id):

    try:

        message = db.session.get(
            ContactMessage,
            message_id
        )

        if not message:

            return jsonify({
                "success": False,
                "message": "Message not found"
            }), 404

        db.session.delete(message)

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Message deleted successfully"
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# 404 ERROR
# =========================================================

@app.errorhandler(404)
def not_found(error):

    return jsonify({
        "success": False,
        "message": "Route not found"
    }), 404


# =========================================================
# 500 ERROR
# =========================================================

@app.errorhandler(500)
def internal_error(error):

    db.session.rollback()

    return jsonify({
        "success": False,
        "message": "Internal server error"
    }), 500


# =========================================================
# RUN LOCAL SERVER
# =========================================================

if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )