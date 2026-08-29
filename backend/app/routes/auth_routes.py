from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt, get_jwt_identity

from app import db
from app.models.user import User

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"error": "username and password are required"}), 400

    user = User.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid credentials"}), 401

    if not user.is_active:
        return jsonify({"error": "Account is inactive. Contact the company."}), 403

    # Retailers must be approved (status == 'active' on their profile) to log in and order
    if user.role == "retailer":
        if not user.retailer_profile or user.retailer_profile.status != "active":
            return jsonify({"error": "Retailer account is not approved/active"}), 403

    token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role, "username": user.username},
    )

    profile = None
    if user.role == "retailer" and user.retailer_profile:
        profile = user.retailer_profile.to_dict()
    elif user.role == "driver" and user.driver_profile:
        profile = user.driver_profile.to_dict()

    return jsonify({"access_token": token, "user": user.to_dict(), "profile": profile}), 200


@auth_bp.get("/me")
@jwt_required()
def me():
    user_id = get_jwt_identity()
    claims = get_jwt()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": user.to_dict(), "role": claims.get("role")}), 200
