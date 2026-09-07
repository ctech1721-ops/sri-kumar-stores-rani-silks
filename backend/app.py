import os
import json

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
from sqlalchemy import text


# =========================================================
# LOAD ENVIRONMENT VARIABLES
# =========================================================

load_dotenv()


# =========================================================
# FLASK APP
# =========================================================

app = Flask(__name__)


# =========================================================
# CORS CONFIGURATION
# =========================================================

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "https://sri-kumar-stores.vercel.app"
            ],
            "methods": [
                "GET",
                "POST",
                "PUT",
                "DELETE",
                "OPTIONS"
            ],
            "allow_headers": [
                "Content-Type",
                "Authorization"
            ]
        }
    },
    supports_credentials=False
)


# =========================================================
# FORCE CORS HEADERS
# =========================================================

@app.after_request
def add_cors_headers(response):

    origin = request.headers.get("Origin")

    if origin == "https://sri-kumar-stores.vercel.app":

        response.headers["Access-Control-Allow-Origin"] = origin

        response.headers["Access-Control-Allow-Methods"] = (
            "GET, POST, PUT, DELETE, OPTIONS"
        )

        response.headers["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization"
        )

        response.headers["Vary"] = "Origin"

    return response


# =========================================================
# DATABASE CONFIGURATION
# =========================================================

database_url = os.getenv("DATABASE_URL")

if not database_url:
    raise RuntimeError(
        "DATABASE_URL is missing in .env"
    )


# Aiven / PostgreSQL compatibility
if database_url.startswith("postgres://"):
    database_url = database_url.replace(
        "postgres://",
        "postgresql://",
        1
    )


app.config["SQLALCHEMY_DATABASE_URI"] = database_url

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

app.config["SECRET_KEY"] = os.getenv(
    "SECRET_KEY",
    "sri-kumar-stores-secret-2026"
)


# =========================================================
# DATABASE
# =========================================================

db = SQLAlchemy(app)


# =========================================================
# PRODUCT MODEL
# =========================================================

class Product(db.Model):

    __tablename__ = "products"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    product_code = db.Column(
        db.String(50),
        unique=True,
        nullable=False
    )

    name = db.Column(
        db.String(200),
        nullable=False
    )

    category = db.Column(
        db.String(100),
        nullable=False
    )

    price = db.Column(
        db.Numeric(10, 2),
        nullable=False
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
        default=0
    )

    created_at = db.Column(
        db.DateTime,
        server_default=db.func.now()
    )

    updated_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
        onupdate=db.func.now()
    )

    # Product size relationship
    size_stocks = db.relationship(
        "ProductSize",
        back_populates="product",
        cascade="all, delete-orphan"
    )

    def to_dict(self):

        sizes = {}

        for size_stock in self.size_stocks:

            sizes[size_stock.size] = (
                size_stock.stock
            )

        if sizes:

            total_stock = sum(
                sizes.values()
            )

        else:

            total_stock = self.stock or 0

        return {

            "id": self.id,

            "product_code": self.product_code,

            "code": self.product_code,

            "name": self.name,

            "category": self.category,

            "price": float(self.price)
            if self.price is not None
            else 0,

            "description": self.description,

            "image_url": self.image_url,

            "image": self.image_url,

            "photo": self.image_url,

            "stock": total_stock,

            "sizes": sizes,

            "size_stocks": sizes,

            "outOfStock": total_stock <= 0,

            "created_at":
                self.created_at.isoformat()
                if self.created_at
                else None,

            "updated_at":
                self.updated_at.isoformat()
                if self.updated_at
                else None
        }


# =========================================================
# PRODUCT SIZE MODEL
# =========================================================

class ProductSize(db.Model):

    __tablename__ = "product_sizes"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    product_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "products.id",
            ondelete="CASCADE"
        ),
        nullable=False
    )

    size = db.Column(
        db.String(30),
        nullable=False
    )

    stock = db.Column(
        db.Integer,
        nullable=False,
        default=0
    )

    product = db.relationship(
        "Product",
        back_populates="size_stocks"
    )

    __table_args__ = (

        db.UniqueConstraint(
            "product_id",
            "size",
            name="uq_product_size"
        ),

    )


# =========================================================
# ORDER MODEL
# =========================================================

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
        db.String(200),
        nullable=True
    )

    customer_phone = db.Column(
        db.String(50),
        nullable=True
    )

    customer_email = db.Column(
        db.String(200),
        nullable=True
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
        server_default=db.func.now()
    )

    def to_dict(self):

        return {

            "id": self.id,

            "order_id": self.order_id,

            "customer_name":
                self.customer_name,

            "customer_phone":
                self.customer_phone,

            "customer_email":
                self.customer_email,

            "items":
                self.items or [],

            "total":
                float(self.total)
                if self.total is not None
                else 0,

            "status":
                self.status,

            "created_at":
                self.created_at.isoformat()
                if self.created_at
                else None
        }


# =========================================================
# CONTACT MESSAGE MODEL
# =========================================================

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
        db.String(200),
        nullable=True
    )

    phone = db.Column(
        db.String(50),
        nullable=True
    )

    message = db.Column(
        db.Text,
        nullable=False
    )

    created_at = db.Column(
        db.DateTime,
        server_default=db.func.now()
    )

    def to_dict(self):

        return {

            "id": self.id,

            "name": self.name,

            "email": self.email,

            "phone": self.phone,

            "message": self.message,

            "created_at":
                self.created_at.isoformat()
                if self.created_at
                else None
        }


# =========================================================
# HOME
# =========================================================

@app.route("/")
def home():

    return jsonify({

        "success": True,

        "message":
            "Sri Kumar Stores Backend is running!"

    })


# =========================================================
# API TEST
# =========================================================

@app.route(
    "/api/test",
    methods=["GET"]
)
def test():

    return jsonify({

        "success": True,

        "message":
            "API connection is working!"

    })


# =========================================================
# DATABASE TEST
# =========================================================

@app.route(
    "/api/db-test",
    methods=["GET"]
)
def db_test():

    try:

        with db.engine.connect() as connection:

            result = connection.execute(
                text("SELECT 1")
            )

            value = result.scalar()

        return jsonify({

            "success": True,

            "database": "connected",

            "result": value

        })

    except Exception as e:

        return jsonify({

            "success": False,

            "database":
                "connection failed",

            "error": str(e)

        }), 500


# =========================================================
# CREATE TABLES
# =========================================================

@app.route(
    "/api/create-tables",
    methods=["GET"]
)
def create_tables():

    try:

        db.create_all()

        return jsonify({

            "success": True,

            "message":
                "Database tables created successfully!"

        })

    except Exception as e:

        return jsonify({

            "success": False,

            "error": str(e)

        }), 500


# =========================================================
# GET ALL PRODUCTS
# =========================================================

@app.route(
    "/api/products",
    methods=["GET"]
)
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
# GET SINGLE PRODUCT
# =========================================================

@app.route(
    "/api/products/<int:product_id>",
    methods=["GET"]
)
def get_product(product_id):

    try:

        product = db.session.get(
            Product,
            product_id
        )

        if not product:

            return jsonify({

                "success": False,

                "message":
                    "Product not found"

            }), 404

        return jsonify({

            "success": True,

            "product":
                product.to_dict()

        })

    except Exception as e:

        return jsonify({

            "success": False,

            "error": str(e)

        }), 500


# =========================================================
# CREATE PRODUCT
# =========================================================

@app.route(
    "/api/admin/products",
    methods=[
        "POST",
        "OPTIONS"
    ]
)
def create_product():

    if request.method == "OPTIONS":

        return jsonify({

            "success": True

        }), 200

    try:

        data = request.get_json(
            silent=True
        )

        if not data:

            return jsonify({

                "success": False,

                "message":
                    "No product data received"

            }), 400

        # -------------------------------------------------
        # NAME
        # -------------------------------------------------

        name = str(
            data.get(
                "name",
                ""
            )
        ).strip()

        if not name:

            return jsonify({

                "success": False,

                "message":
                    "Product name is required"

            }), 400

        # -------------------------------------------------
        # CATEGORY
        # -------------------------------------------------

        category = str(
            data.get(
                "category",
                ""
            )
        ).strip()

        if not category:

            return jsonify({

                "success": False,

                "message":
                    "Category is required"

            }), 400

        # -------------------------------------------------
        # PRICE
        # -------------------------------------------------

        try:

            price = float(
                data.get(
                    "price",
                    0
                )
            )

        except (
            TypeError,
            ValueError
        ):

            return jsonify({

                "success": False,

                "message":
                    "Invalid price"

            }), 400

        if price < 0:

            return jsonify({

                "success": False,

                "message":
                    "Price cannot be negative"

            }), 400

        # -------------------------------------------------
        # DESCRIPTION
        # -------------------------------------------------

        description = str(
            data.get(
                "description",
                ""
            )
        ).strip()

        # -------------------------------------------------
        # PRODUCT CODE
        # -------------------------------------------------

        product_code = str(
            data.get(
                "product_code",
                data.get(
                    "code",
                    ""
                )
            )
        ).strip()

        if not product_code:

            product_code = (
                "SKS-"
                + str(
                    Product.query.count() + 1
                )
            )

        existing_product = Product.query.filter_by(
            product_code=product_code
        ).first()

        if existing_product:

            return jsonify({

                "success": False,

                "message":
                    "Product code already exists"

            }), 409

        # -------------------------------------------------
        # IMAGE
        # -------------------------------------------------

        image_url = data.get(
            "image_url",
            data.get(
                "image",
                data.get(
                    "photo",
                    ""
                )
            )
        )

        # -------------------------------------------------
        # CREATE PRODUCT
        # -------------------------------------------------

        product = Product(

            product_code=product_code,

            name=name,

            category=category,

            price=price,

            description=description,

            image_url=image_url,

            stock=0

        )

        db.session.add(product)

        db.session.flush()

        # -------------------------------------------------
        # SIZE STOCK
        # -------------------------------------------------

        sizes = data.get(
            "sizes",
            {}
        )

        total_stock = 0

        if isinstance(
            sizes,
            dict
        ):

            for size, stock_value in sizes.items():

                try:

                    stock_value = int(
                        stock_value or 0
                    )

                except (
                    TypeError,
                    ValueError
                ):

                    stock_value = 0

                if stock_value < 0:

                    stock_value = 0

                if stock_value > 0:

                    size_stock = ProductSize(

                        product_id=product.id,

                        size=str(
                            size
                        ).strip(),

                        stock=stock_value

                    )

                    db.session.add(
                        size_stock
                    )

                    total_stock += (
                        stock_value
                    )

        # -------------------------------------------------
        # NORMAL STOCK
        # -------------------------------------------------

        if not sizes:

            try:

                total_stock = int(
                    data.get(
                        "stock",
                        0
                    ) or 0
                )

            except (
                TypeError,
                ValueError
            ):

                total_stock = 0

        product.stock = total_stock

        # -------------------------------------------------
        # SAVE
        # -------------------------------------------------

        db.session.commit()

        return jsonify({

            "success": True,

            "message":
                "Product added successfully!",

            "product":
                product.to_dict()

        }), 201

    except Exception as e:

        db.session.rollback()

        print("")
        print("=" * 60)
        print("PRODUCT SAVE ERROR")
        print("=" * 60)
        print(str(e))
        print("=" * 60)
        print("")

        return jsonify({

            "success": False,

            "message":
                "Failed to add product",

            "error": str(e)

        }), 500


# =========================================================
# UPDATE PRODUCT
# =========================================================

@app.route(
    "/api/admin/products/<int:product_id>",
    methods=[
        "PUT",
        "OPTIONS"
    ]
)
def update_product(product_id):

    if request.method == "OPTIONS":

        return jsonify({

            "success": True

        }), 200

    try:

        product = db.session.get(
            Product,
            product_id
        )

        if not product:

            return jsonify({

                "success": False,

                "message":
                    "Product not found"

            }), 404

        data = request.get_json(
            silent=True
        )

        if not data:

            return jsonify({

                "success": False,

                "message":
                    "No product data received"

            }), 400

        # NAME
        if "name" in data:

            name = str(
                data.get(
                    "name",
                    ""
                )
            ).strip()

            if not name:

                return jsonify({

                    "success": False,

                    "message":
                        "Product name is required"

                }), 400

            product.name = name

        # CATEGORY
        if "category" in data:

            category = str(
                data.get(
                    "category",
                    ""
                )
            ).strip()

            if not category:

                return jsonify({

                    "success": False,

                    "message":
                        "Category is required"

                }), 400

            product.category = category

        # DESCRIPTION
        if "description" in data:

            product.description = str(
                data.get(
                    "description",
                    ""
                )
            ).strip()

        # PRODUCT CODE
        if (
            "product_code" in data
            or "code" in data
        ):

            new_code = str(
                data.get(
                    "product_code",
                    data.get(
                        "code",
                        ""
                    )
                )
            ).strip()

            if new_code:

                duplicate = Product.query.filter(

                    Product.product_code
                    == new_code,

                    Product.id
                    != product_id

                ).first()

                if duplicate:

                    return jsonify({

                        "success": False,

                        "message":
                            "Product code already exists"

                    }), 409

                product.product_code = new_code

        # PRICE
        if "price" in data:

            try:

                product.price = float(
                    data.get(
                        "price",
                        0
                    )
                )

            except (
                TypeError,
                ValueError
            ):

                return jsonify({

                    "success": False,

                    "message":
                        "Invalid price"

                }), 400

        # IMAGE
        if (
            "image_url" in data
            or "image" in data
            or "photo" in data
        ):

            product.image_url = data.get(
                "image_url",
                data.get(
                    "image",
                    data.get(
                        "photo",
                        product.image_url
                    )
                )
            )

        # SIZE STOCK
        if "sizes" in data:

            sizes = data.get(
                "sizes",
                {}
            )

            ProductSize.query.filter_by(
                product_id=product.id
            ).delete(
                synchronize_session=False
            )

            total_stock = 0

            if isinstance(
                sizes,
                dict
            ):

                for size, stock_value in sizes.items():

                    try:

                        stock_value = int(
                            stock_value or 0
                        )

                    except (
                        TypeError,
                        ValueError
                    ):

                        stock_value = 0

                    if stock_value < 0:

                        stock_value = 0

                    if stock_value > 0:

                        size_stock = ProductSize(

                            product_id=product.id,

                            size=str(
                                size
                            ).strip(),

                            stock=stock_value

                        )

                        db.session.add(
                            size_stock
                        )

                        total_stock += (
                            stock_value
                        )

            product.stock = total_stock

        # NORMAL STOCK
        elif "stock" in data:

            try:

                product.stock = int(
                    data.get(
                        "stock",
                        0
                    ) or 0
                )

            except (
                TypeError,
                ValueError
            ):

                product.stock = 0

        db.session.commit()

        return jsonify({

            "success": True,

            "message":
                "Product updated successfully!",

            "product":
                product.to_dict()

        })

    except Exception as e:

        db.session.rollback()

        print("")
        print("=" * 60)
        print("PRODUCT UPDATE ERROR")
        print("=" * 60)
        print(str(e))
        print("=" * 60)
        print("")

        return jsonify({

            "success": False,

            "message":
                "Failed to update product",

            "error": str(e)

        }), 500


# =========================================================
# DELETE PRODUCT
# =========================================================

@app.route(
    "/api/admin/products/<int:product_id>",
    methods=[
        "DELETE",
        "OPTIONS"
    ]
)
def delete_product(product_id):

    if request.method == "OPTIONS":

        return jsonify({

            "success": True

        }), 200

    try:

        product = db.session.get(
            Product,
            product_id
        )

        if not product:

            return jsonify({

                "success": False,

                "message":
                    "Product not found"

            }), 404

        db.session.delete(product)

        db.session.commit()

        return jsonify({

            "success": True,

            "message":
                "Product deleted successfully!"

        })

    except Exception as e:

        db.session.rollback()

        print("")
        print("=" * 60)
        print("PRODUCT DELETE ERROR")
        print("=" * 60)
        print(str(e))
        print("=" * 60)
        print("")

        return jsonify({

            "success": False,

            "message":
                "Failed to delete product",

            "error": str(e)

        }), 500


# =========================================================
# CREATE ORDER
# =========================================================

@app.route(
    "/api/orders",
    methods=[
        "POST",
        "OPTIONS"
    ]
)
def create_order():

    if request.method == "OPTIONS":

        return jsonify({

            "success": True

        }), 200

    try:

        data = request.get_json(
            silent=True
        )

        if not data:

            return jsonify({

                "success": False,

                "message":
                    "No order data received"

            }), 400

        # -------------------------------------------------
        # ORDER ID
        # -------------------------------------------------

        order_id = str(
            data.get(
                "order_id",
                ""
            )
        ).strip()

        if not order_id:

            order_id = (
                "ORD-"
                + str(
                    int(
                        __import__("time").time()
                        * 1000
                    )
                )
            )

        # -------------------------------------------------
        # CUSTOMER DETAILS
        # -------------------------------------------------

        customer_name = str(
            data.get(
                "customer_name",
                data.get(
                    "name",
                    ""
                )
            )
        ).strip()

        customer_phone = str(
            data.get(
                "customer_phone",
                data.get(
                    "phone",
                    ""
                )
            )
        ).strip()

        customer_email = str(
            data.get(
                "customer_email",
                data.get(
                    "email",
                    ""
                )
            )
        ).strip()

        # -------------------------------------------------
        # ITEMS
        # -------------------------------------------------

        items = data.get(
            "items",
            []
        )

        if not isinstance(
            items,
            list
        ):

            return jsonify({

                "success": False,

                "message":
                    "Order items must be an array"

            }), 400

        if len(items) == 0:

            return jsonify({

                "success": False,

                "message":
                    "Order must contain at least one item"

            }), 400

        # -------------------------------------------------
        # TOTAL
        # -------------------------------------------------

        try:

            total = float(
                data.get(
                    "total",
                    0
                )
            )

        except (
            TypeError,
            ValueError
        ):

            return jsonify({

                "success": False,

                "message":
                    "Invalid order total"

            }), 400

        if total < 0:

            return jsonify({

                "success": False,

                "message":
                    "Order total cannot be negative"

            }), 400

        # -------------------------------------------------
        # STATUS
        # -------------------------------------------------

        status = str(
            data.get(
                "status",
                "Pending"
            )
        ).strip()

        if not status:

            status = "Pending"

        # -------------------------------------------------
        # CHECK DUPLICATE ORDER ID
        # -------------------------------------------------

        existing_order = Order.query.filter_by(
            order_id=order_id
        ).first()

        if existing_order:

            return jsonify({

                "success": False,

                "message":
                    "Order ID already exists",

                "order":
                    existing_order.to_dict()

            }), 409

        # -------------------------------------------------
        # CREATE ORDER
        # -------------------------------------------------

        order = Order(

            order_id=order_id,

            customer_name=customer_name,

            customer_phone=customer_phone,

            customer_email=customer_email,

            items=items,

            total=total,

            status=status

        )

        db.session.add(order)

        db.session.commit()

        return jsonify({

            "success": True,

            "message":
                "Order saved successfully!",

            "order":
                order.to_dict()

        }), 201

    except Exception as e:

        db.session.rollback()

        print("")
        print("=" * 60)
        print("ORDER SAVE ERROR")
        print("=" * 60)
        print(str(e))
        print("=" * 60)
        print("")

        return jsonify({

            "success": False,

            "message":
                "Failed to save order",

            "error": str(e)

        }), 500


# =========================================================
# GET ALL ORDERS
# =========================================================

@app.route(
    "/api/orders",
    methods=["GET"]
)
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

            "message":
                "Failed to load orders",

            "error": str(e)

        }), 500


# =========================================================
# GET SINGLE ORDER
# =========================================================

@app.route(
    "/api/orders/<string:order_id>",
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

                "message":
                    "Order not found"

            }), 404

        return jsonify({

            "success": True,

            "order":
                order.to_dict()

        })

    except Exception as e:

        return jsonify({

            "success": False,

            "message":
                "Failed to load order",

            "error": str(e)

        }), 500


# =========================================================
# UPDATE ORDER STATUS
# =========================================================

@app.route(
    "/api/orders/<string:order_id>",
    methods=[
        "PUT",
        "OPTIONS"
    ]
)
def update_order(order_id):

    if request.method == "OPTIONS":

        return jsonify({

            "success": True

        }), 200

    try:

        order = Order.query.filter_by(
            order_id=order_id
        ).first()

        if not order:

            return jsonify({

                "success": False,

                "message":
                    "Order not found"

            }), 404

        data = request.get_json(
            silent=True
        ) or {}

        if "status" in data:

            status = str(
                data.get(
                    "status",
                    ""
                )
            ).strip()

            if status:

                order.status = status

        if "customer_name" in data:

            order.customer_name = str(
                data.get(
                    "customer_name",
                    ""
                )
            ).strip()

        if "customer_phone" in data:

            order.customer_phone = str(
                data.get(
                    "customer_phone",
                    ""
                )
            ).strip()

        if "customer_email" in data:

            order.customer_email = str(
                data.get(
                    "customer_email",
                    ""
                )
            ).strip()

        db.session.commit()

        return jsonify({

            "success": True,

            "message":
                "Order updated successfully!",

            "order":
                order.to_dict()

        })

    except Exception as e:

        db.session.rollback()

        print("")
        print("=" * 60)
        print("ORDER UPDATE ERROR")
        print("=" * 60)
        print(str(e))
        print("=" * 60)
        print("")

        return jsonify({

            "success": False,

            "message":
                "Failed to update order",

            "error": str(e)

        }), 500


# =========================================================
# DELETE ORDER
# =========================================================

@app.route(
    "/api/orders/<string:order_id>",
    methods=[
        "DELETE",
        "OPTIONS"
    ]
)
def delete_order(order_id):

    if request.method == "OPTIONS":

        return jsonify({

            "success": True

        }), 200

    try:

        order = Order.query.filter_by(
            order_id=order_id
        ).first()

        if not order:

            return jsonify({

                "success": False,

                "message":
                    "Order not found"

            }), 404

        db.session.delete(order)

        db.session.commit()

        return jsonify({

            "success": True,

            "message":
                "Order deleted successfully!"

        })

    except Exception as e:

        db.session.rollback()

        print("")
        print("=" * 60)
        print("ORDER DELETE ERROR")
        print("=" * 60)
        print(str(e))
        print("=" * 60)
        print("")

        return jsonify({

            "success": False,

            "message":
                "Failed to delete order",

            "error": str(e)

        }), 500


# =========================================================
# CREATE CONTACT MESSAGE
# =========================================================

@app.route(
    "/api/contact-messages",
    methods=[
        "POST",
        "OPTIONS"
    ]
)
def create_contact_message():

    if request.method == "OPTIONS":

        return jsonify({

            "success": True

        }), 200

    try:

        data = request.get_json(
            silent=True
        )

        if not data:

            return jsonify({

                "success": False,

                "message":
                    "No contact message data received"

            }), 400

        # -------------------------------------------------
        # NAME
        # -------------------------------------------------

        name = str(
            data.get(
                "name",
                ""
            )
        ).strip()

        if not name:

            return jsonify({

                "success": False,

                "message":
                    "Name is required"

            }), 400

        # -------------------------------------------------
        # EMAIL
        # -------------------------------------------------

        email = str(
            data.get(
                "email",
                ""
            )
        ).strip()

        # -------------------------------------------------
        # PHONE
        # -------------------------------------------------

        phone = str(
            data.get(
                "phone",
                ""
            )
        ).strip()

        # -------------------------------------------------
        # MESSAGE
        # -------------------------------------------------

        message = str(
            data.get(
                "message",
                ""
            )
        ).strip()

        if not message:

            return jsonify({

                "success": False,

                "message":
                    "Message is required"

            }), 400

        # -------------------------------------------------
        # CREATE CONTACT MESSAGE
        # -------------------------------------------------

        contact_message = ContactMessage(

            name=name,

            email=email,

            phone=phone,

            message=message

        )

        db.session.add(
            contact_message
        )

        db.session.commit()

        return jsonify({

            "success": True,

            "message":
                "Contact message saved successfully!",

            "contact_message":
                contact_message.to_dict()

        }), 201

    except Exception as e:

        db.session.rollback()

        print("")
        print("=" * 60)
        print("CONTACT MESSAGE SAVE ERROR")
        print("=" * 60)
        print(str(e))
        print("=" * 60)
        print("")

        return jsonify({

            "success": False,

            "message":
                "Failed to save contact message",

            "error":
                str(e)

        }), 500


# =========================================================
# GET ALL CONTACT MESSAGES
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

            "message":
                "Failed to load contact messages",

            "error":
                str(e)

        }), 500


# =========================================================
# GET SINGLE CONTACT MESSAGE
# =========================================================

@app.route(
    "/api/contact-messages/<int:message_id>",
    methods=["GET"]
)
def get_contact_message(message_id):

    try:

        contact_message = db.session.get(
            ContactMessage,
            message_id
        )

        if not contact_message:

            return jsonify({

                "success": False,

                "message":
                    "Contact message not found"

            }), 404

        return jsonify({

            "success": True,

            "contact_message":
                contact_message.to_dict()

        })

    except Exception as e:

        return jsonify({

            "success": False,

            "message":
                "Failed to load contact message",

            "error":
                str(e)

        }), 500


# =========================================================
# DELETE CONTACT MESSAGE
# =========================================================

@app.route(
    "/api/contact-messages/<int:message_id>",
    methods=[
        "DELETE",
        "OPTIONS"
    ]
)
def delete_contact_message(message_id):

    if request.method == "OPTIONS":

        return jsonify({

            "success": True

        }), 200

    try:

        contact_message = db.session.get(
            ContactMessage,
            message_id
        )

        if not contact_message:

            return jsonify({

                "success": False,

                "message":
                    "Contact message not found"

            }), 404

        db.session.delete(
            contact_message
        )

        db.session.commit()

        return jsonify({

            "success": True,

            "message":
                "Contact message deleted successfully!"

        })

    except Exception as e:

        db.session.rollback()

        print("")
        print("=" * 60)
        print("CONTACT MESSAGE DELETE ERROR")
        print("=" * 60)
        print(str(e))
        print("=" * 60)
        print("")

        return jsonify({

            "success": False,

            "message":
                "Failed to delete contact message",

            "error": str(e)

        }), 500


# =========================================================
# 404 ERROR
# =========================================================

@app.errorhandler(404)
def not_found(error):

    return jsonify({

        "success": False,

        "message":
            "API route not found",

        "path":
            request.path

    }), 404


# =========================================================
# GENERAL ERROR
# =========================================================

@app.errorhandler(500)
def internal_error(error):

    return jsonify({

        "success": False,

        "message":
            "Internal server error"

    }), 500


# =========================================================
# RUN SERVER
# =========================================================

if __name__ == "__main__":

    print("")
    print("=" * 60)
    print("Sri Kumar Stores Backend")
    print("=" * 60)

    print(
        "Server: http://127.0.0.1:5000"
    )

    print(
        "Products: http://127.0.0.1:5000/api/products"
    )

    print(
        "Orders: http://127.0.0.1:5000/api/orders"
    )

    print(
        "Contact Messages: "
        "http://127.0.0.1:5000/api/contact-messages"
    )

    print("=" * 60)
    print("")

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )
