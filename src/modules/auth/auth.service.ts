import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { User } from "../users/entities/user.entity"
import { Repository } from "typeorm"
import { CreateUserDto } from "../users/dto/create-user.dto"
import { ApiError } from "../../common/constants/errors"
import { UsersService } from "../users/users.service"
import { LoginUserDto } from "./dto/login-user.dto"
import * as bcrypt from "bcrypt"
import { TokenService } from "../token/token.service"
import { TokenResponse } from "./response/token.response"
import { TokenPayload } from "../token/types"
import { JwtService } from "@nestjs/jwt"

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly tokenService: TokenService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async registerUser(CreateUserDto: CreateUserDto): Promise<TokenResponse> {
    const existUser = await this.usersService.findUserByEmail(
      CreateUserDto.email,
    )
    // if (existUser) throw new BadRequestException(ApiError.USER_EXIST)

    const newUser = await this.usersService.createUser(CreateUserDto)
    const tokens = await this.tokenService.getTokens(newUser)
    await this.tokenService.updateRefreshToken(newUser.id, tokens.refreshToken)

    return tokens
  }

  async loginUser(LoginUserDto: LoginUserDto): Promise<TokenResponse> {
    const existUser = await this.usersService.findUserByEmail(
      LoginUserDto.email,
    )
    if (!existUser || !existUser.password)
      throw new BadRequestException(ApiError.WRONG_DATA)

    const isPasswordValid = await bcrypt.compare(
      LoginUserDto.password,
      existUser.password,
    )
    if (!isPasswordValid) throw new BadRequestException(ApiError.WRONG_DATA)

    const tokens = await this.tokenService.getTokens(existUser)
    await this.tokenService.updateRefreshToken(
      existUser.id,
      tokens.refreshToken,
    )
    return tokens
  }

  async logoutUser(refreshToken: string) {
    const decodedUser = this.jwtService.decode(refreshToken) as TokenPayload
    if (!decodedUser) throw new ForbiddenException("Access Denied")

    const user = await this.usersRepository.update(
      { id: decodedUser.id },
      { refreshToken: null },
    )

    if (!user) throw new ForbiddenException("Access Denied")

    return user
  }
}
